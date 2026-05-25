import express from "express";

import { MatchService } from "#match/match.service.js";
import { EditionController } from "./edition.controller.js";
import { EditionService } from "./edition.service.js";

const router = express.Router();

const matchService = new MatchService();
const editionService = new EditionService();

const editionController = new EditionController(matchService, editionService);

router.get("/current/", editionController.getCurrentEditionAndRound);
router.get("/stage-timestamps/", editionController.getStagesTimestamps);
router.get("/stadiums/", editionController.getStadiums);

export default router;
