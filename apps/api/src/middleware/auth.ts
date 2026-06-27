import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

type AccessTokenPayload = { sub: string; role: UserRole; type: 'access' };

export const requireAuth: RequestHandler = (req, _res, next) => {
  const value = req.headers.authorization;
  if (!value?.startsWith('Bearer ')) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  try {
    const payload = jwt.verify(value.slice(7), env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== 'access') throw new Error('Invalid token type');
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired access token', 'INVALID_TOKEN'));
  }
};
