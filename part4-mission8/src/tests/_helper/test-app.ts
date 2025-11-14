import type { Express } from 'express';
import { app } from '../../app.js';

export function createTestApp(): Express {
  return app;
}
