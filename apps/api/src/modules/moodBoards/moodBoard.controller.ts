import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CreateMoodBoardItemInput,
  ListMoodBoardItemsQuery,
  MoodBoardEventParams,
  MoodBoardItemParams,
  UpdateMoodBoardItemInput,
} from './moodBoard.schemas.js';
import {
  createMoodBoardItem,
  deleteMoodBoardItem,
  getMoodBoardItemById,
  getMoodBoardItems,
  getMoodBoardSummary,
  updateMoodBoardItem,
} from './moodBoard.service.js';

export const createMoodBoardItemHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as MoodBoardEventParams;

  const item = await createMoodBoardItem(
    req.auth!.userId,
    eventId,
    req.body as CreateMoodBoardItemInput,
  );

  res.status(201).json({
    success: true,
    data: item,
    message: 'Mood-board item created successfully',
  });
});

export const getMoodBoardItemsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as MoodBoardEventParams;

  const result = await getMoodBoardItems(
    req.auth!.userId,
    eventId,
    req.query as unknown as ListMoodBoardItemsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

export const getMoodBoardItemByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, itemId } = req.params as MoodBoardItemParams;

  const item = await getMoodBoardItemById(req.auth!.userId, eventId, itemId);

  res.status(200).json({
    success: true,
    data: item,
  });
});

export const updateMoodBoardItemHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, itemId } = req.params as MoodBoardItemParams;

  const item = await updateMoodBoardItem(
    req.auth!.userId,
    eventId,
    itemId,
    req.body as UpdateMoodBoardItemInput,
  );

  res.status(200).json({
    success: true,
    data: item,
    message: 'Mood-board item updated successfully',
  });
});

export const deleteMoodBoardItemHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, itemId } = req.params as MoodBoardItemParams;

  await deleteMoodBoardItem(req.auth!.userId, eventId, itemId);

  res.status(204).send();
});

export const getMoodBoardSummaryHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as MoodBoardEventParams;

  const summary = await getMoodBoardSummary(req.auth!.userId, eventId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});
