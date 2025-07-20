import { z } from 'zod';
import { defineModel, MongoModel, connect, disconnect, InferModel, InsertType } from '../src';
import { ObjectId } from 'mongodb';

const userSchema = defineModel(z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
}));

type User = InferModel<typeof userSchema>;
type UserInsert = InsertType<typeof userSchema>;

async function runTests() {
  try {
    await connect('mongodb://localhost:27017', 'mizzleorm_test_db');
    console.log('Connected to MongoDB for testing.');

    const UserModel = new MongoModel('users', userSchema);

    // Clean up before tests
    await UserModel.delete({});
    console.log('Cleaned up existing data.');

    // Test 1: Insert a new user
    const newUser: UserInsert = {
      name: 'Test User',
      email: 'test@example.com',
      age: 25,
    };
    const insertResult = await UserModel.insertOne(newUser);
    console.log('Test 1 (Insert): User inserted with ID:', insertResult.insertedId);
    if (!insertResult.insertedId) {
      throw new Error('Test 1 Failed: User not inserted.');
    }

    // Test 2: Find the inserted user
    const foundUser = await UserModel.findOne({ _id: new ObjectId(insertResult.insertedId) });
    console.log('Test 2 (Find One): Found user:', foundUser);
    if (!foundUser || foundUser.email !== 'test@example.com') {
      throw new Error('Test 2 Failed: User not found or data mismatch.');
    }

    // Test 3: Update the user
    const updateResult = await UserModel.update(
      { _id: new ObjectId(insertResult.insertedId) },
      { age: 26 }
    );
    console.log('Test 3 (Update): Modified count:', updateResult.modifiedCount);
    if (updateResult.modifiedCount !== 1) {
      throw new Error('Test 3 Failed: User not updated.');
    }
    const updatedUser = await UserModel.findOne({ _id: new ObjectId(insertResult.insertedId) });
    if (!updatedUser || updatedUser.age !== 26) {
      throw new Error('Test 3 Failed: Updated user data mismatch.');
    }

    // Test 4: Delete the user
    const deleteResult = await UserModel.delete({ _id: new ObjectId(insertResult.insertedId) });
    console.log('Test 4 (Delete): Deleted count:', deleteResult.deletedCount);
    if (deleteResult.deletedCount !== 1) {
      throw new Error('Test 4 Failed: User not deleted.');
    }
    const deletedUser = await UserModel.findOne({ _id: new ObjectId(insertResult.insertedId) });
    if (deletedUser) {
      throw new Error('Test 4 Failed: User still exists after deletion.');
    }

    console.log('\nAll tests passed successfully!');

  } catch (error) {
    console.error('\nTests failed:', error);
    process.exit(1);
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests();


