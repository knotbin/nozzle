# mizzleORM

A lightweight, fully type-safe MongoDB ODM in TypeScript, inspired by Drizzle ORM.

## Features

*   **Schema-first:** Define and validate document schemas using Zod.
*   **Type-safe queries:** Auto-complete and type-safe insert/find/update/delete operations.
*   **Lightweight & modular:** No decorators, no runtime magic – everything is composable and transparent.
*   **Developer-first DX:** Simple, minimal API with great IDE support.
*   Works directly on top of MongoDB's native driver.

## Installation

```bash
npm install mizzleorm mongodb zod
# or
yarn add mizzleorm mongodb zod
```

## Usage

### 1. Define your schema

```typescript
// src/schemas/user.ts
import { z } from 'zod';
import { defineModel } from 'mizzleorm';

export const userSchema = defineModel(z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
}));

export type User = z.infer<typeof userSchema>;
```

### 2. Connect to MongoDB and create a model

```typescript
// src/index.ts or your main application file
import { connect, MongoModel, InferModel, InsertType } from 'mizzleorm';
import { userSchema } from './schemas/user'; // Assuming you saved the schema above
import { ObjectId } from 'mongodb';

// Infer types
type User = InferModel<typeof userSchema>;
type UserInsert = InsertType<typeof userSchema>;

async function main() {
  await connect('mongodb://localhost:27017', 'your_database_name');
  const UserModel = new MongoModel('users', userSchema);

  // ... perform operations

  await disconnect();
}

main().catch(console.error);
```

### 3. Perform operations

```typescript
// Insert a document
const newUser: UserInsert = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  age: 30,
};
const insertResult = await UserModel.insertOne(newUser);
console.log('Inserted user:', insertResult.insertedId);

// Find documents
const users = await UserModel.find({ name: 'John Doe' });
console.log('Found users:', users);

// Find one document
const foundUser = await UserModel.findOne({ _id: new ObjectId(insertResult.insertedId) });
console.log('Found one user:', foundUser);

// Update a document
const updateResult = await UserModel.update(
  { _id: new ObjectId(insertResult.insertedId) },
  { age: 31 }
);
console.log('Updated user count:', updateResult.modifiedCount);

// Delete documents
const deleteResult = await UserModel.delete({ name: 'John Doe' });
console.log('Deleted user count:', deleteResult.deletedCount);
```

## Project Structure

```
mongo-orm/
├── src/
│   ├── schema.ts         # schema definition utility
│   ├── model.ts          # MongoModel wrapper
│   ├── client.ts         # MongoDB connection
│   ├── index.ts          # public API export
├── examples/
│   └── user.ts           # usage example
├── tests/
├── package.json
├── tsconfig.json
├── README.md
```

## Development

To build the project:

```bash
npm run build
```

To run the example:

```bash
npm run example
```

## License

MIT


