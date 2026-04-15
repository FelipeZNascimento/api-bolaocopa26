import { MailerService } from "#mailer/mailer.service.js";
import { UserController } from "#user/user.controller.js";
import { UserService } from "#user/user.service.js";
import express from "express";

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const userController = new UserController(userService, mailerService);

// Post routes
router.post("/login", userController.login);
router.post("/forgot-password", userController.forgotPassword);
router.post("/update-password", userController.updatePassword);
router.post("/update-profile", userController.updateProfile);
router.post("/register", userController.register);

// Get routes
router.get("/logout", userController.logout);
router.get("/activeProfile", userController.getActiveProfile);
router.get("/all{/:edition}", userController.getAll);
router.get("/:userId{/:edition}", userController.getById);

export default router;
