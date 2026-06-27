import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export const validate =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      req.body = parsed.body ?? req.body;
      req.params = parsed.params ?? req.params;
      req.query = parsed.query ?? req.query;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError(
            400,
            'Validation failed',
            'VALIDATION_ERROR',
            error.flatten(),
          ),
        );
      }

      next(error);
    }
  };