import { Router } from "express";

import {
  getUserProfileController,
  searchUsersController,
  updateMyProfileController,
} from "../controllers/user.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * Every user route requires authentication.
 */
router.use(authenticate);

router.get("/search", searchUsersController);

/*
 * IMPORTANT:
 * /me must appear before /:userId.
 *
 * Otherwise Express could interpret "me" as a userId.
 */
router.put("/me", updateMyProfileController);

router.get("/:userId", getUserProfileController);

export default router;