import fs from 'node:fs'

export class AppendOnlyClient {
  private fd: number
  private offset = 0
  private index: Record<string, { offset: number, length: number } | undefined> = {}

  constructor(filePath: string) {
    this.fd = fs.openSync(filePath, "a+")
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

  delete(key: string) {
    const message = this.buildMessage(key, null, { deleted: true })
    this.index[key] = undefined
    fs.writevSync(this.fd, [Buffer.from(message)]);
  }

  private buildMessage(key: string, value: string | null, { deleted }: { deleted?: boolean } = {}) {
    const formattedValue = JSON.stringify({ value, timestamp: Date.now(), deleted })
    return `${this.messagePrefix(key)}${formattedValue}\n`
  }

  private messagePrefix(key: string) {
    return key + ": "
  }
}
