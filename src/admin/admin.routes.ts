import express from "express";

import { EditionService } from "#edition/edition.service.js";
import { MailerService } from "#mailer/mailer.service.js";
import { requireAdmin } from "#middlewares/middlewares.js";
import { UserService } from "#user/user.service.js";
import { AdminController } from "./admin.controller.js";

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const editionService = new EditionService();
const adminController = new AdminController(userService, mailerService, editionService);

// All admin routes require an authenticated admin session
router.use(requireAdmin);

// router.post("/login", adminController.login);

// Get routes
router.get("/all-users{/:edition}", adminController.getAll);
router.get("/delete-from-edition", adminController.deleteFromEdition);
router.get("/flush", adminController.flushAll);
router.get("/health", adminController.getHealth);

// Post routes
router.post("/update-active-status", adminController.updateActiveStatus);

export default router;
