# Append-Only Storage

A simple, append-only storage adapter for [Keyv](https://github.com/jaredwray/keyv), providing persistent key-value storage with an append-only log file structure.

## Installation

```bash
npm install append-only-storage
# or
yarn add append-only-storage
# or
pnpm add append-only-storage
```

## Usage

```ts
import { AppendOnlyKeyv } from '..';

// Create an instance with a namespace
const storage = new AppendOnlyKeyv('data.db', { namespace: 'users' });

await storage.set('user1', JSON.stringify({ name: 'John' }));

const user = JSON.parse(await storage.get('user1'));

await storage.delete('user1');

const exists = await storage.has('user1');

// Clear all entries (only clears the index, not the file)
await storage.clear();

// Disconnect when done
await storage.disconnect();
```

## Features

- Implements the Keyv storage adapter interface
- Append-only file structure for durability
- Namespace support for key grouping
- Simple and lightweight API

## API

### `new AppendOnlyKeyv(filePath, options)`

Creates a new storage instance.

- `filePath`: Path to the storage file
- `options`:
  - `namespace`: Optional namespace for keys

### Methods

- `get(key)`: Retrieve a value by key
- `set(key, value)`: Store a value
- `delete(key)`: Mark a key as deleted
- `has(key)`: Check if a key exists
- `clear()`: Clear the in-memory index
- `disconnect()`: Close the file descriptor

## Limitations

This is a barebones implementation and has several limitations:

- No compaction mechanism for the append-only log
- The entire index is kept in memory
- Limited error handling and recovery mechanisms
- No encryption or compression

## Contributing

Contributions are highly appreciated! This is a minimal implementation that can benefit from improvements in many areas:

- File compaction for removing deleted entries
- Better error handling
- Performance optimizations
- Tests and documentation

