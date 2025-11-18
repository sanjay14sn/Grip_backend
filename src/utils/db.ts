import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Load environment variables
// const {
//   MONGO_USER,
//   MONGO_PASSWORD,
//   MONGO_HOST,
//   MONGO_PORT,
//   MONGO_DB
// } = process.env;

// Validate required env vars
// if (!MONGO_HOST || !MONGO_PORT || !MONGO_DB) {
//   console.error('Error: MONGO_HOST, MONGO_PORT, and MONGO_DB must be defined');
//   process.exit(1);
// }

// Build MongoDB URI (include credentials if provided)
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('Error: MongoDB connection string not defined');
  process.exit(1);
}
export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connection established successfully.');
    console.log(`Connected to MongoDB at ${MONGODB_URI}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit if the initial connection fails
  }
};
