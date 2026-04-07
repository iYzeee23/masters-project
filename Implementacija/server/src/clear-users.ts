import mongoose from 'mongoose';
import { User } from './models';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/pathfinder');
  const r = await User.deleteMany({});
  // eslint-disable-next-line no-console
  console.log('Deleted', r.deletedCount, 'users');
  await mongoose.disconnect();
}

main();
