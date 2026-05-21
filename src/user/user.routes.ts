import express from "express";

import { MailerService } from "#mailer/mailer.service.js";
import { requireAuth } from "#middlewares/middlewares.js";
import { UserController } from "#user/user.controller.js";
import { UserService } from "#user/user.service.js";

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const userController = new UserController(userService, mailerService);

// Post routes
router.post("/login", userController.login);
router.post("/forgot-password", userController.forgotPassword);
router.post("/update-password", requireAuth, userController.updatePassword);
router.post("/update-profile", requireAuth, userController.updateProfile);
router.post("/update-favorites", requireAuth, userController.updateFavorites);
router.post("/register", userController.register);

// Get routes
router.get("/logout", requireAuth, userController.logout);
router.get("/activeProfile", requireAuth, userController.getActiveProfile);

export default router;
