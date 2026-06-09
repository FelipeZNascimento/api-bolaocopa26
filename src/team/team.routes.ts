import express from "express";

import { EditionService } from "#edition/edition.service.js";
import { TeamController } from "#team/team.controller.js";
import { TeamService } from "#team/team.service.js";

const router = express.Router();
const teamService = new TeamService();
const editionService = new EditionService();

const teamController = new TeamController(editionService, teamService);

router.get("/all{/:edition}", teamController.getAll);
router.get("/players{/:edition}", teamController.getPlayers);
router.get("/:teamId", teamController.getById);

export default router;
