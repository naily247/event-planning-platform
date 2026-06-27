import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import { AppError } from '../utils/AppError.js';

export const authorize = (...allowedRoles: UserRole[]): RequestHandler => (req, _res, next) => {
  if (!req.auth) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  if (!allowedRoles.includes(req.auth.role)) return next(new AppError(403, 'You do not have permission for this action', 'FORBIDDEN'));
  next();
};
