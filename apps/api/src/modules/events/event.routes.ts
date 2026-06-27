import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

export const eventRouter = Router();
eventRouter.use(requireAuth, authorize(UserRole.CUSTOMER, UserRole.ADMIN));
eventRouter.get('/', (_req, res) => res.json({ success: true, data: [], meta: { note: 'Replace with ownership-scoped event retrieval.' } }));
