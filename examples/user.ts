import { z } from 'zod';
import { defineModel, MongoModel, connect, disconnect, InferModel, InsertType } from '../src';
import { ObjectId } from 'mongodb';

// 1. Define your schema using Zod
const userSchema = defineModel(z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
}));

// Infer the TypeScript type from the Zod schema
type User = InferModel<typeof userSchema>;
type UserInsert = InsertType<typeof userSchema>;

async function runExample() {
  try {
    // 3. Connect to MongoDB
    await connect('mongodb://localhost:27017', 'mizzleorm_example');
    console.log('Connected to MongoDB');

    // 2. Create a MongoModel for your collection
    const UserModel = new MongoModel('users', userSchema);

    // Clean up previous data
    await UserModel.delete({});

    // 4. Insert a new document
    const newUser: UserInsert = {
      name: 'Alice Smith',
      email: 'alice@example.com',
      age: 30,
    };
    const insertResult = await UserModel.insertOne(newUser);
    console.log('Inserted user:', insertResult.insertedId);

    // 5. Find documents
    const users = await UserModel.find({ name: 'Alice Smith' });
    console.log('Found users:', users);

    // 6. Find one document
    const foundUser = await UserModel.findOne({ _id: new ObjectId(insertResult.insertedId) });
    console.log('Found one user:', foundUser);

    // 7. Update a document
    const updateResult = await UserModel.update(
      { _id: new ObjectId(insertResult.insertedId) },
      { age: 31 }
    );
    console.log('Updated user count:', updateResult.modifiedCount);

    const updatedUser = await UserModel.findOne({ _id: new ObjectId(insertResult.insertedId) });
    console.log('Updated user data:', updatedUser);

    // 8. Delete documents
    const deleteResult = await UserModel.delete({ name: 'Alice Smith' });
    console.log('Deleted user count:', deleteResult.deletedCount);

  } catch (error) {
    console.error('Error during example run:', error);
  } finally {
    // 9. Disconnect from MongoDB
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

runExample();




