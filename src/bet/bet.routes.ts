import express from "express";

import { BetController } from "#bet/bet.controller.js";
import { BetService } from "#bet/bet.service.js";
import { EditionService } from "#edition/edition.service.js";
import { MatchService } from "#match/match.service.js";
import { requireAuth } from "#middlewares/middlewares.js";
import { TeamService } from "#team/team.service.js";
import { UserService } from "#user/user.service.js";

const router = express.Router();
const matchService = new MatchService();
const betService = new BetService();
const userService = new UserService();
const teamService = new TeamService();
const editionService = new EditionService();
const betController = new BetController(betService, matchService, userService, teamService, editionService);

router.post("/update", requireAuth, betController.update);
router.get("/extra/results", betController.getExtrasResults);
router.get("/extra", betController.getExtras);
router.post("/extra/update", requireAuth, betController.updateExtra);

export default router;
