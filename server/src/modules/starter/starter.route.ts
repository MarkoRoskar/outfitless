import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { addStarterKit } from "./starter.controller";

// POST /api/starter-kit adds the ready Push / Pull / Legs routine to a new, empty account
const router = express.Router();

router.use(authMiddleware);

router.post("/", addStarterKit);

export default router;
