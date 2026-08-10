import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const getDatabaseUri = () => {
  const uri = process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!uri) {
    throw new Error("Missing database connection string. Set MONGO_URI or DATABASE_URL in your .env file.");
  }

  return uri;
};

export const connectDB = async () => {
  try {
    await mongoose.connect(getDatabaseUri());
    console.log("MongoDB Connected");
  } catch (error: any) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};