import express from "express";
import { AppController } from "./app.controller.js";

const router = express.Router();
const appController = new AppController();

// Get routes
router.get("/health", appController.getHealth);

export default router;
