import jwt from 'jsonwebtoken';
import { userRepository } from '../data/repositories/user.repository';
import { hashPassword, verifyPassword } from '../utils/password';
import { env } from '../config/env';
import { RegisterDto, LoginDto } from '../domain/dto/auth.dto';

export async function register(dto: RegisterDto) {
  const existing = await userRepository.findByEmail(dto.email);
  if (existing) {
    throw new Error('User already exists');
  }
  const passwordHash = hashPassword(dto.password);
  const user = await userRepository.create(dto.email, passwordHash);
  return buildAuthPayload(user.id, user.email);
}

export async function login(dto: LoginDto) {
  const user = await userRepository.findByEmail(dto.email);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  if (!verifyPassword(dto.password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }
  return buildAuthPayload(user.id, user.email);
}

export function buildAuthPayload(userId: string, email: string) {
  const token = jwt.sign({ sub: userId, email }, env.jwtSecret, { expiresIn: '12h' });
  return { userId, email, token };
}
