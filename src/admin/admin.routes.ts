import express from "express";

import { MailerService } from "#mailer/mailer.service.js";
import { requireAdmin } from "#middlewares/middlewares.js";
import { UserService } from "#user/user.service.js";
import { AdminController } from "./admin.controller";

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const adminController = new AdminController(userService, mailerService);

// All admin routes require an authenticated admin session
router.use(requireAdmin);

// router.post("/login", adminController.login);

// Get routes
router.get("/all-users{/:edition}", adminController.getAll);
router.get("/delete-from-edition", adminController.deleteFromEdition);

// Post routes
router.post("/update-active-status", adminController.updateActiveStatus);

export default router;
