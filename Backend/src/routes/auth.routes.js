import { Router } from "express";
import {
  register,
  login,
  getMe,
  logout,
  googleLogin,
  requestPasswordReset,
  resetPassword
} from "../controllers/auth.controller.js";

import {
  registerValidator,
  loginValidator,
  validate,
  forgotPasswordValidator,
  resetPasswordValidator
} from "../validators/auth.validator.js";

import { authUser } from "../middleware/auth.middleware.js";
import { authRateLimit } from "../middleware/rateLimit.middleware.js";

const authRouter = Router();

authRouter.use(authRateLimit);

/** @route POST /api/auth/register */
authRouter.post("/register", registerValidator, validate, register);

/** @route POST /api/auth/login */
authRouter.post("/login", loginValidator, validate, login);

/** @route POST /api/auth/google */
authRouter.post("/google", googleLogin); // ✅ cleaner naming

/** @route GET /api/auth/me */
authRouter.get("/me", authUser, getMe); // ✅ cleaner naming

/** @route POST /api/auth/logout */
authRouter.post("/logout", logout);

/** @route POST /api/auth/forgot-password */
authRouter.post("/forgot-password", forgotPasswordValidator, validate, requestPasswordReset);

/** @route POST /api/auth/reset-password */
authRouter.post("/reset-password", resetPasswordValidator, validate, resetPassword);

export default authRouter;