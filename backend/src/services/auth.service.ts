import jwt from 'jsonwebtoken';
import { userRepository } from '../data/repositories/user.repository';
import { hashPassword, verifyPassword } from '../utils/password';
import { env } from '../config/env';
import { RegisterDto, LoginDto, ResetPasswordDto } from '../domain/dto/auth.dto';
import { User } from '../domain/models/User';

export async function register(dto: RegisterDto) {
  const existing = await userRepository.findByEmail(dto.email);
  if (existing) {
    throw new Error('User already exists');
  }
  const passwordHash = hashPassword(dto.password);
  const user = await userRepository.create(dto.email, passwordHash);
  return buildAuthPayload(user);
}

export async function login(dto: LoginDto) {
  const user = await userRepository.findByEmail(dto.email);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  if (!verifyPassword(dto.password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }
  return buildAuthPayload(user);
}

export async function resetPassword(dto: ResetPasswordDto) {
  const user = await userRepository.findByEmail(dto.email);
  if (!user) {
    throw new Error('User not found');
  }

  const passwordHash = hashPassword(dto.password);
  await userRepository.updatePasswordHash(dto.email, passwordHash);
  return { success: true };
}

export function buildAuthPayload(user: User) {
  const token = jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, { expiresIn: '12h' });
  return { userId: user.id, email: user.email, token, settings: user.settings ?? {} };
}
