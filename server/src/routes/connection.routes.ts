import { Router } from "express";
import {
  acceptConnectionRequestController,
  getConnectionsController,
  getReceivedRequestsController,
  getSentRequestsController,
  rejectConnectionRequestController,
  sendConnectionRequestController,
  getRelationshipController,
  getConnectionCountController,
  removeConnectionController,
} from "../controllers/connection.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/count", getConnectionCountController);

router.post("/", sendConnectionRequestController);

router.get("/", getConnectionsController);

router.get("/received", getReceivedRequestsController);

router.get("/sent", getSentRequestsController);

router.get("/relationship/:userId", getRelationshipController);

router.post("/:connectionId/accept", acceptConnectionRequestController);

router.post("/:connectionId/reject", rejectConnectionRequestController);

router.delete(
  "/:connectionId",
  removeConnectionController,
);


export default router;