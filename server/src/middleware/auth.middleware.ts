import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../modules/auth/auth.model";
import { AuthRequest } from "../common/types/shared_types";

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Extract token ("Bearer TOKEN")
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string
    };

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    // Attach user to request
    req.user = { id: user._id.toString(), email: user.email };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized or expired token" });
  }
};