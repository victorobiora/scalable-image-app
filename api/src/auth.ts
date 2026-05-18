import { Request, Response, NextFunction } from "express";

type Role = "creator" | "consumer";

export function requireRole(allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") {
      return next();
    }

    const apiKey = req.headers["x-api-key"];

    console.log(
      process.env.CREATOR_API_KEY === apiKey,
      process.env.CREATOR_API_KEY,
      apiKey,
    );

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(401).json({ error: "Missing API key" });
    }

    let role: Role | null = null;

    if (apiKey === process.env.CREATOR_API_KEY) {
      role = "creator";
    }

    if (apiKey === process.env.CONSUMER_API_KEY) {
      role = "consumer";
    }

    if (!role) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    if (!allowed.includes(role)) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }

    (req as any).role = role;

    next();
  };
}
