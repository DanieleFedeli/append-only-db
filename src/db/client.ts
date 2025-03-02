import fs from 'node:fs'

export class AppendOnlyClient {
  private fd: number

  constructor(filePath: string) {
    this.fd = fs.openSync(filePath, "a+")
  }

  get(key: string) {
    const stats = fs.fstatSync(this.fd);
    const buffer = Buffer.alloc(stats.size);
    const bytesRead = fs.readSync(this.fd, buffer, 0, stats.size, 0);
    const content = buffer.slice(0, bytesRead).toString('utf8');
    
    const lines = content.split('\n');
    lines.reverse();
    for (const line of lines) {
      const [k, v] = line.split(':');
      if (k === key) {
        return v.trim();
      }
    }
    return undefined;
  }

  set(key: string, value: string) {
    const message = `\n${key}: ${String(value)}`
    fs.writevSync(this.fd, [Buffer.from(message)])
    return 'OK' as const
  }
}
