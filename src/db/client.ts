import fs from 'node:fs'
import type { KeyvStoreAdapter, } from 'keyv'
import { EventEmitter } from 'node:events'

export interface AppendOnlyKeyvOpts {
  namespace?: string
}
export class AppendOnlyKeyv extends EventEmitter implements KeyvStoreAdapter {
  private fd: number
  private offset = 0
  private index: Record<string, { offset: number, length: number } | undefined> = {}
  private filePath: string
  namespace?: string | undefined

  constructor(filePath: string, opts: AppendOnlyKeyvOpts = {}) {
    super()
    this.filePath = filePath
    this.fd = fs.openSync(filePath, "a+")
    this.namespace = opts.namespace
  }

  get opts() {
    return {
      filePath: this.filePath,
      fd: this.fd,
      currentOffset: this.offset,
    }
  }

  get(key: string) {
    const record = this.index[key];
    if (!record) return undefined
    const kl = this.messagePrefix(key).length
    const bytesRead = record.length - kl
    const buffer = Buffer.alloc(bytesRead)
    fs.readSync(this.fd, buffer, 0, bytesRead, record.offset + kl);

    return JSON.parse(buffer.toString().trim()).value
  }

  set(key: string, value: string) {
    const message = this.buildMessage(key, value)
    const bytesWritten = fs.writevSync(this.fd, [Buffer.from(message)]);
    this.index[key] = { length: bytesWritten, offset: this.offset };
    this.offset += bytesWritten
    return 'OK' as const
  }

  async delete(key: string) {
    const message = this.buildMessage(key, null, { deleted: true })
    this.index[key] = undefined
    return new Promise<boolean>((resolve,) => {
      fs.writev(this.fd, [Buffer.from(message)], () => {
        resolve(true)
      });

    })
  }

  clear(): Promise<void> {
    this.index = {}
    return Promise.resolve()
  }

  has?(key: string): Promise<boolean> {
    const record = this.index[key];
    return Promise.resolve(Boolean(record))
  }

  disconnect?(): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.close(this.fd, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  private buildMessage(key: string, value: string | null, { deleted }: { deleted?: boolean } = {}) {
    const formattedValue = JSON.stringify({ value, timestamp: Date.now(), deleted })
    return `${this.messagePrefix(key)}${formattedValue}\n`
  }

  private messagePrefix(key: string) {
    if (this.namespace) return `${this.namespace}:${key}: `
    return key + ": "
  }
}
