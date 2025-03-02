import fs from 'node:fs'

export class AppendOnlyClient {
  private fd: number
  private offset = 0
  // Store the byte where the key is written in the file
  private index: Record<string, { offset: number, length: number }> = {}

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

    return buffer.toString().trim()
  }

  set(key: string, value: string) {
    const message = this.buildMessage(key, value)
    const bytesWritten = fs.writevSync(this.fd, [Buffer.from(message)]);
    this.index[key] = { length: bytesWritten, offset: this.offset };
    this.offset += bytesWritten
    return 'OK' as const
  }

  private buildMessage(key: string, value: string) {
    return `${this.messagePrefix(key)}${value}\n`
  }

  private messagePrefix(key: string) {
    return key + ": "
  }
}
