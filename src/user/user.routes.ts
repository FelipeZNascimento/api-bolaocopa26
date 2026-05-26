import express from "express";
import { rateLimit } from "express-rate-limit";

import { MailerService } from "#mailer/mailer.service.js";
import { requireAuth } from "#middlewares/middlewares.js";
import { UserController } from "#user/user.controller.js";
import { UserService } from "#user/user.service.js";

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const userController = new UserController(userService, mailerService);

// 10 attempts per 15 minutes per IP for auth endpoints
const authLimiter = rateLimit({
  legacyHeaders: false,
  limit: 10,
  message: { message: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

// 5 attempts per hour for password reset to limit email sending
const forgotPasswordLimiter = rateLimit({
  legacyHeaders: false,
  limit: 5,
  message: { message: "Muitas tentativas. Tente novamente em 1 hora." },
  standardHeaders: true,
  windowMs: 60 * 60 * 1000,
});

// Post routes
router.post("/login", authLimiter, userController.login);
router.post("/forgot-password", forgotPasswordLimiter, userController.forgotPassword);
router.post("/update-password", requireAuth, userController.updatePassword);
router.post("/update-password-from-token", userController.updatePasswordFromToken);
router.post("/update-profile", requireAuth, userController.updateProfile);
router.post("/update-favorites", requireAuth, userController.updateFavorites);
router.post("/register", authLimiter, userController.register);
router.post("/push/subscribe", requireAuth, userController.subscribePushNotifications);

// Get routes
router.get("/logout", requireAuth, userController.logout);
router.get("/activeProfile", userController.getActiveProfile);

export default router;
