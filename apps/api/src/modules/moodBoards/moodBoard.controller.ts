import type { RequestHandler } from 'express';

import { uploadAsset } from '../uploads/upload.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CreateMoodBoardItemInput,
  CreateMoodBoardItemWithUploadInput,
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

const MOOD_BOARD_UPLOAD_FOLDER = 'event-platform/mood-board-images';

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

export const createMoodBoardItemWithUploadHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { eventId } = req.params as MoodBoardEventParams;
    const input = req.body as CreateMoodBoardItemWithUploadInput;

    const uploadedImage = await uploadAsset({
      file: req.file,
      folder: MOOD_BOARD_UPLOAD_FOLDER,
    });

    const item = await createMoodBoardItem(req.auth!.userId, eventId, {
      ...input,
      imageUrl: uploadedImage.fileUrl,
      imagePublicId: uploadedImage.filePublicId,
    });

    res.status(201).json({
      success: true,
      data: item,
      upload: uploadedImage,
      message: 'Mood-board item image uploaded successfully',
    });
  },
);

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