import { Response } from "express";
import { AuthRequest } from "../../common/types/shared_types";
import * as starterService from "./starter.service";

// Errors thrown here reach errorMiddleware by themselves (Express 5)
export const addStarterKit = async (req: AuthRequest, res: Response) => {
  res.status(201).json(await starterService.addStarterKit(req.user!.id));
};
