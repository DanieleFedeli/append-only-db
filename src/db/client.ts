import { EventEmitter } from "node:events";
import fs from "node:fs";
import type { KeyvStoreAdapter, StoredData } from "keyv";

export interface AppendOnlyKeyvOpts {
	namespace?: string;
}

type Message = {
	payload: string | undefined;
	timestamp: number;
	deleted?: boolean;
};

export class AppendOnlyKeyv extends EventEmitter implements KeyvStoreAdapter {
	private fd: number;
	private offset = 0;
	private index: Record<
		string,
		{ offset: number; length: number } | undefined
	> = {};
	private filePath: string;
	namespace?: string | undefined;

	constructor(filePath: string, opts: AppendOnlyKeyvOpts = {}) {
		super();
		this.filePath = filePath;
		this.fd = fs.openSync(filePath, "a+");
		this.namespace = opts.namespace;
	}

	get opts() {
		return {
			filePath: this.filePath,
			fd: this.fd,
			currentOffset: this.offset,
		};
	}

	async get<Value = unknown>(
		key: string,
	): Promise<StoredData<Value> | undefined> {
		const record = this.index[key];
		if (!record) return undefined;
		const kl = this.messagePrefix(key).length;
		const bytesRead = record.length - kl;
		const buffer = Buffer.alloc(bytesRead);

		return new Promise<StoredData<Value> | undefined>((resolve, reject) => {
			fs.read(this.fd, buffer, 0, bytesRead, record.offset + kl, (err) => {
				if (err) return reject(err);

				const parsed = JSON.parse(buffer.toString().trim());
				resolve(parsed.value.payload);
			});
		});
	}

	async set(key: string, value: string) {
		const message = this.buildMessage(value);
		const serializedMessage = this.serializeMessage(key, message);
		const bytesWritten = fs.writevSync(this.fd, [
			Buffer.from(serializedMessage),
		]);
		this.index[key] = { length: bytesWritten, offset: this.offset };
		this.offset += bytesWritten;
		return "OK" as const;
	}

	async delete(key: string) {
		const message = this.buildMessage(undefined, { deleted: true });
		const serializedMessage = this.serializeMessage(key, message);
		this.index[key] = undefined;
		return new Promise<boolean>((resolve) => {
			fs.writev(this.fd, [Buffer.from(serializedMessage)], () => {
				resolve(true);
			});
		});
	}

	clear(): Promise<void> {
		this.index = {};
		return Promise.resolve();
	}

	has(key: string): Promise<boolean> {
		const record = this.index[key];
		return Promise.resolve(Boolean(record));
	}

	disconnect(): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.close(this.fd, (err) => {
				if (err) {
					return reject(err);
				}
				return resolve();
			});
		});
	}

	private buildMessage(
		value: string | undefined,
		{ deleted }: { deleted?: boolean } = {},
	): StoredData<Message> {
		return {
			value: {
				payload: value,
				timestamp: Date.now(),
				deleted,
			},
			expires: undefined,
		} satisfies StoredData<Message>;
	}

	private serializeMessage(key: string, msg: StoredData<Message>) {
		return `${this.messagePrefix(key)}${JSON.stringify(msg)}`;
	}

	private messagePrefix(key: string) {
		if (this.namespace) return `${this.namespace}:${key}: `;
		return `${key}: `;
	}
}
