import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { loginController, 
        refreshTokenController,
        signupController,
        logoutController,
        getMeController,
    } from "../controllers/auth.controller.js";

const router = Router();
//signup or registration.
router.post("/signup", signupController);
//login 
router.post("/login", loginController);
// refreshtoken
router.post("/refresh", refreshTokenController);
//logout
router.post("/logout", logoutController);
//get current user
router.get("/me", authenticate, getMeController);

export default router;