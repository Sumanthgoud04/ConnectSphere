import { Router } from "express";
import {
  getConversationController,
  markConversationAsReadController,
  sendMessageController,
} from "../controllers/message.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", sendMessageController);

router.patch(
  "/:userId/read",
  markConversationAsReadController,
);

router.get("/:userId", getConversationController);

export default router;