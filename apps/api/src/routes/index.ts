import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { eventRouter } from '../modules/events/event.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';
import { vendorRouter } from '../modules/vendors/vendor.routes.js';

export const apiRouter = Router();
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/events', eventRouter);
apiRouter.use('/vendors', vendorRouter);
