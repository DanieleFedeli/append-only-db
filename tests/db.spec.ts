import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { AppendOnlyKeyv } from '../src/db/client'

describe("AppendOnlyClient", () => {
  const filename = Math.random().toString(36).substring(7) + ".txt"

  afterEach(() => {
    fs.unlinkSync(filename)
  })

  describe("set method", () => {
    it("returns 'OK' upon a successful set", async () => {
      const client = new AppendOnlyKeyv(filename)

      const res = await client.set("key", "value")
      expect(res).toBe("OK")
    })

    it("writes the key-value pair to the file", async () => {
      const client = new AppendOnlyKeyv(filename)

      await client.set("key", "value")

      const content = fs.readFileSync(path.join(filename), "utf8").split('\n').filter(Boolean).pop()
      expect(content).contain("value")
      expect(content).contain("key")
      expect(content).contain("timestamp")
    })
  })

  describe("get method", () => {
    it("returns undefined if the key doesn't exist", async () => {
      const client = new AppendOnlyKeyv(filename)

      expect(await client.get("key")).toBeUndefined()
    })

    it("works with namespaced keys", async () => {
      const client = new AppendOnlyKeyv(filename, { namespace: "ns" })

      client.set("key", "value")

      expect(await client.get("key")).toBe("value")
    })

    it("returns the value for the given key", async () => {
      const client = new AppendOnlyKeyv(filename)

      await client.set("key", "value - 1")

      expect(await client.get("key")).toBe("value - 1")
    })

    it("returns the right key even after multiple different sets", async () => {
      const client = new AppendOnlyKeyv(filename)

      client.set("key", "value")
      client.set("key 1", "value - 1")
      client.set("key 2", "value - 2")
      client.set("key 3", "value - 3")

      expect(await client.get("key 2")).toBe("value - 2")
      expect(await client.get("key")).toBe("value")
    })
  })

  describe("delete method", () => {
    it("returns true", async () => {
      const client = new AppendOnlyKeyv(filename)

      await client.set("a", "b")
      const res = await client.delete("a")
      expect(res).toBe(true)
    })

    it("adds a tombstone to the file", async () => {
      const client = new AppendOnlyKeyv(filename)

      await client.set("a", "b")
      await client.delete("a")

      const content = fs.readFileSync(filename)
      expect(content.toString()).toContain("deleted\":true")
    })

    it("removes the key from the index", async () => {
      const client = new AppendOnlyKeyv(filename)

      await client.set("a", "b")
      await client.delete("a")

      expect(await client.get("a")).toBeUndefined()
    })
  })

  describe("opts getter", () => {
    it("returns an object", () => {
      const client = new AppendOnlyKeyv(filename)

      expect(client.opts.filePath).toBe(filename)
      expect(client.opts).toEqual(expect.objectContaining({
        currentOffset: expect.any(Number),
        fd: expect.any(Number)
      }))
    })
  })

  describe("clear method", () => {
    it("clears the index", async () => {
      const client = new AppendOnlyKeyv(filename)

      await client.set("a", "b")
      await client.clear()

      expect(await client.get("a")).toBeUndefined()
    })
  })

  describe("has method", () => {
    it("returns true if the key exists", async () => {
      const client = new AppendOnlyKeyv(filename)

      await client.set("a", "b")

      expect(await client.has("a")).toBe(true)
    })
  })
})
