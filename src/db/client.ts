import fs from 'node:fs'

export class AppendOnlyClient<T = any> {
  private fd: number

  constructor(filePath: string) {
    this.fd = fs.openSync(filePath, "a")
  }

  async get(key: string) {
    throw new Error('Not implemented')
  }

  set(key: string, value: T) {
    const message = `\n${key}: ${String(value)}`
    fs.writevSync(this.fd, [Buffer.from(message)])
    return 'OK' as const
  }
}
