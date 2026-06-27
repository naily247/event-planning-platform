import { Router } from 'express';
export const vendorRouter = Router();
vendorRouter.get('/', (_req, res) => res.json({ success: true, data: [], meta: { note: 'Public vendor discovery foundation.' } }));
