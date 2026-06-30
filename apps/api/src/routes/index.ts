import { Router } from 'express';
import { adminRouter } from '../modules/admin/admin.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { categoryRouter } from '../modules/categories/category.routes.js';
import { eventRouter } from '../modules/events/event.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';
import { vendorRouter } from '../modules/vendors/vendor.routes.js';
import { packageRouter } from '../modules/packages/package.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/events', eventRouter);
apiRouter.use('/vendors', vendorRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/packages', packageRouter);
