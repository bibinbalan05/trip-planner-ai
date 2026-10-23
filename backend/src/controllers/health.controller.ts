import type { RequestHandler } from 'express';

export const getHealth: RequestHandler = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'trip-planner-backend',
    timestamp: new Date().toISOString(),
  });
};
