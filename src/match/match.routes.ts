import express from "express";

import { BetService } from "#bet/bet.service.js";
import { EditionService } from "#edition/edition.service.js";
import { MatchController } from "#match/match.controller.js";
import { MatchService } from "#match/match.service.js";
import { TeamService } from "#team/team.service.js";
import { WebSocketService } from "#websocket/websocket.service.js";

const router = express.Router();

const websocketService = WebSocketService.getInstance();
const matchService = new MatchService();
const betService = new BetService();
const teamService = new TeamService();
const editionService = new EditionService();

const matchController = new MatchController(matchService, betService, teamService, websocketService, editionService);

router.post("/update", matchController.updateMatches);

router.get("/", matchController.getByEdition);
router.get("/next-matches", matchController.getNextMatches);
router.get("/live-matches", matchController.getLiveMatches);
router.get("/sync-matches", matchController.syncMatches);
router.get("/:edition{/:round}", matchController.getByEdition);

export default router;
