import mongoose from 'mongoose';

export const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export type UserDocument = mongoose.Document & {
  email: string;
  passwordHash: string;
};

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
