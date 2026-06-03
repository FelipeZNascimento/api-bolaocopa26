import type { IPlayer, ITeam } from "#team/team.types.js";

import { NextFunction, Request, Response } from "express";

import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { AppError } from "#utils/appError.js";
import { checkEdition } from "#utils/checkEdition.js";
import { editionMapping } from "#utils/editionMapping.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "./team.util.js";

export class TeamController extends BaseController {
  constructor(private teamService: TeamService) {
    super();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const currentEdition = process.env.EDITION ? parseInt(process.env.EDITION) : null;
      const edition = parseInt(req.params.edition) || currentEdition;

      if (!currentEdition || !edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const editionId = edition && edition < 2000 ? edition : editionMapping(edition);

      if (editionId === 0) {
        throw new AppError("Parâmetro inválido", 400, ErrorCode.INVALID_INPUT);
      }

      let formattedTeams: ITeam[] = [];

      if (formattedTeams.length === 0) {
        formattedTeams = await getTeamsFromCacheOrFetch(this.teamService, editionId);
      }

      return formattedTeams;
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const teamId = req.params.teamId;
      const { currentEdition } = checkEdition(req.params.edition);

      if (!teamId) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const team: ITeam = await this.teamService.getById(parseInt(teamId), currentEdition);
      return team;
    });
  };

  getPlayers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { edition } = checkEdition(req.params.edition);
      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, edition);
      const players: IPlayer[] = await getPlayersFromCacheOrFetch(this.teamService, edition, teams);
      const filteredPlayers = players
        .filter((player) => player.id !== 864 && player.position.id !== 1)
        .sort((a, b) => a.name.localeCompare(b.name));
      return filteredPlayers;
    });
  };
}
