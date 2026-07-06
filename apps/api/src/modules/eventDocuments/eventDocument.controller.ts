import type { RequestHandler } from 'express';

import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  AddEventDocumentFilesInput,
  CreateEventDocumentInput,
  EventDocumentEventParams,
  EventDocumentFileParams,
  EventDocumentParams,
  ListEventDocumentsQuery,
  ReplaceEventDocumentFileInput,
  UpdateEventDocumentInput,
} from './eventDocument.schemas.js';
import {
  addEventDocumentFiles,
  createEventDocument,
  deleteEventDocument,
  deleteEventDocumentFile,
  getEventDocumentById,
  getEventDocuments,
  getEventDocumentSummary,
  replaceEventDocumentFile,
  updateEventDocument,
} from './eventDocument.service.js';

export const createEventDocumentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventDocumentEventParams;

  const document = await createEventDocument(
    req.auth!.userId,
    eventId,
    req.body as CreateEventDocumentInput,
  );

  res.status(201).json({
    success: true,
    data: document,
    message: 'Event document created successfully',
  });
});

export const getEventDocumentsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventDocumentEventParams;

  const result = await getEventDocuments(
    req.auth!.userId,
    eventId,
    req.query as unknown as ListEventDocumentsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.documents,
    pagination: result.pagination,
  });
});

export const getEventDocumentByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, documentId } = req.params as EventDocumentParams;

  const document = await getEventDocumentById(req.auth!.userId, eventId, documentId);

  res.status(200).json({
    success: true,
    data: document,
  });
});

export const updateEventDocumentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, documentId } = req.params as EventDocumentParams;

  const document = await updateEventDocument(
    req.auth!.userId,
    eventId,
    documentId,
    req.body as UpdateEventDocumentInput,
  );

  res.status(200).json({
    success: true,
    data: document,
    message: 'Event document updated successfully',
  });
});

export const deleteEventDocumentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, documentId } = req.params as EventDocumentParams;

  await deleteEventDocument(req.auth!.userId, eventId, documentId);

  res.status(204).send();
});

export const addEventDocumentFilesHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, documentId } = req.params as EventDocumentParams;

  const document = await addEventDocumentFiles(
    req.auth!.userId,
    eventId,
    documentId,
    req.body as AddEventDocumentFilesInput,
  );

  res.status(201).json({
    success: true,
    data: document,
    message: 'Event document files added successfully',
  });
});

export const replaceEventDocumentFileHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, documentId, fileId } = req.params as EventDocumentFileParams;

  const file = await replaceEventDocumentFile(
    req.auth!.userId,
    eventId,
    documentId,
    fileId,
    req.body as ReplaceEventDocumentFileInput,
  );

  res.status(200).json({
    success: true,
    data: file,
    message: 'Event document file replaced successfully',
  });
});

export const deleteEventDocumentFileHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, documentId, fileId } = req.params as EventDocumentFileParams;

  await deleteEventDocumentFile(req.auth!.userId, eventId, documentId, fileId);

  res.status(204).send();
});

export const getEventDocumentSummaryHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventDocumentEventParams;

  const summary = await getEventDocumentSummary(req.auth!.userId, eventId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});
