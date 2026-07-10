import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { uploadSingleImage } from '../../middleware/upload.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  createMoodBoardItemHandler,
  createMoodBoardItemWithUploadHandler,
  deleteMoodBoardItemHandler,
  getMoodBoardItemByIdHandler,
  getMoodBoardItemsHandler,
  getMoodBoardSummaryHandler,
  updateMoodBoardItemHandler,
} from './moodBoard.controller.js';
import {
  createMoodBoardItemRequestSchema,
  createMoodBoardItemWithUploadRequestSchema,
  deleteMoodBoardItemRequestSchema,
  getMoodBoardItemByIdRequestSchema,
  getMoodBoardItemsRequestSchema,
  getMoodBoardSummaryRequestSchema,
  updateMoodBoardItemRequestSchema,
} from './moodBoard.schemas.js';

export const moodBoardRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

moodBoardRouter.get(
  '/events/:eventId/summary',
  ...customerOnly,
  validate(getMoodBoardSummaryRequestSchema),
  getMoodBoardSummaryHandler,
);

moodBoardRouter.post(
  '/events/:eventId/items',
  ...customerOnly,
  validate(createMoodBoardItemRequestSchema),
  createMoodBoardItemHandler,
);

moodBoardRouter.post(
  '/events/:eventId/items/upload',
  ...customerOnly,
  uploadSingleImage,
  validate(createMoodBoardItemWithUploadRequestSchema),
  createMoodBoardItemWithUploadHandler,
);

moodBoardRouter.get(
  '/events/:eventId/items',
  ...customerOnly,
  validate(getMoodBoardItemsRequestSchema),
  getMoodBoardItemsHandler,
);

moodBoardRouter.get(
  '/events/:eventId/items/:itemId',
  ...customerOnly,
  validate(getMoodBoardItemByIdRequestSchema),
  getMoodBoardItemByIdHandler,
);

moodBoardRouter.patch(
  '/events/:eventId/items/:itemId',
  ...customerOnly,
  validate(updateMoodBoardItemRequestSchema),
  updateMoodBoardItemHandler,
);

moodBoardRouter.delete(
  '/events/:eventId/items/:itemId',
  ...customerOnly,
  validate(deleteMoodBoardItemRequestSchema),
  deleteMoodBoardItemHandler,
);