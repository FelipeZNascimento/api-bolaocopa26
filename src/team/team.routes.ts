import { TeamController } from "#team/team.controller.js";
import { TeamService } from "#team/team.service.js";
import express from "express";

const router = express.Router();
const teamService = new TeamService();
const teamController = new TeamController(teamService);

router.get("/all{/:edition}", teamController.getAll);
router.get("/:teamId", teamController.getById);

export default router;
