import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { AppendOnlyClient } from '../src/db/client'

describe("AppendOnlyClient", () => {
  const filename = Math.random().toString(36).substring(7) + ".txt"

  afterEach(() => {
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

      const content = fs.readFileSync(path.join(filename), "utf8").split('\n').filter(Boolean).pop()
      expect(content).contain("value")
      expect(content).contain("value")
      expect(content).contain("timestamp")
    })
  })

  describe("get method", () => {
    it("returns the value for the given key", () => {
      const client = new AppendOnlyClient(filename)

      client.set("key", "value - 1")

      expect(client.get("key")).toBe("value - 1")
    })

    it("returns the right key even after multiple different sets", () => {
      const client = new AppendOnlyClient(filename)

      client.set("key", "value")
      client.set("key 1", "value - 1")
      client.set("key 2", "value - 2")
      client.set("key 3", "value - 3")

      expect(client.get("key 2")).toBe("value - 2")
      expect(client.get("key")).toBe("value")
    })
  })
})
