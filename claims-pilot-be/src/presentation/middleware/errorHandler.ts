import { Request, Response, NextFunction } from "express";
import { logger } from "../../config/logger";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`${req.method} ${req.path} — ${err.message}`, { stack: err.stack });

  if (err.message.includes("not found") || err.message.includes("Not found")) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err.message.includes("already") || err.message.includes("duplicate")) {
    res.status(409).json({ error: err.message });
    return;
  }

  if (err.message.includes("Invalid") || err.message.includes("invalid")) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}
