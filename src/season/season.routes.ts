import express from "express";

import { MatchService } from "#match/match.service.js";
import { SeasonController } from "#season/season.controller.js";
import { SeasonService } from "./season.service.js";

const router = express.Router();

const matchService = new MatchService();
const seasonService = new SeasonService();

const seasonController = new SeasonController(matchService, seasonService);

router.get("/current/", seasonController.getCurrentSeasonAndRound);
router.get("/stage-timestamps/", seasonController.getStagesTimestamps);

export default router;
