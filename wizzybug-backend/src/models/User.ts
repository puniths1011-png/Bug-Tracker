import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'developer' | 'tester';
  status: 'pending' | 'active';
  inviteToken?: string;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['admin', 'developer', 'tester'], default: 'developer' },
  status: { type: String, enum: ['pending', 'active'], default: 'active' },
  inviteToken: { type: String }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
