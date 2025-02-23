import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { AppendOnlyClient } from '../src/db/client'

describe("AppendOnlyClient", () => {
  const filename = Math.random().toString(36).substring(7) + ".txt"

  afterAll(() => {
    fs.unlinkSync(filename)
  })

  describe("set method", () => {
    it("returns 'OK' upon a successful set", () => {
      const client = new AppendOnlyClient(filename)

      expect(client.set("key", "value")).toBe("OK")
    })

    it("writes the key-value pair to the file", () => {
      const client = new AppendOnlyClient(filename)

      client.set("key", "value")

      const content = fs.readFileSync(path.join(filename), "utf8").split('\n').pop()
      expect(content).toBe("key: value")
    })
  })
})
