import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'developer' | 'tester';
  status: 'pending' | 'active';
  inviteToken?: string;
  resetToken?: string;
  resetTokenExpiresAt?: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, maxlength: 40 },
  email: { type: String, required: true, unique: true, maxlength: 40 },
  password: { type: String },
  role: { type: String, enum: ['admin', 'developer', 'tester'], default: 'developer' },
  status: { type: String, enum: ['pending', 'active'], default: 'active' },
  inviteToken: { type: String },
  resetToken: { type: String },
  resetTokenExpiresAt: { type: Date }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
