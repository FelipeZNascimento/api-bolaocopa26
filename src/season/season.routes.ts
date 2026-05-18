import express from "express";

import { MatchService } from "#match/match.service.js";
import { SeasonController } from "#season/season.controller.js";

const router = express.Router();

const matchService = new MatchService();

const seasonController = new SeasonController(matchService);

router.get("/current/", seasonController.getCurrentSeasonAndWeek);

export default router;
