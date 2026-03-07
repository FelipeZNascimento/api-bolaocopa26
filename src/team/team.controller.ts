import type { IConfederation, ITeam } from "#team/team.types.js";

import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { AppError } from "#utils/appError.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { editionMapping } from "#utils/editionMapping.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { NextFunction, Request, Response } from "express";

import { getConfederationsFromCacheOrFetch, getTeamsFromCacheOrFetch } from "./team.util";

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
      let confederations: IConfederation[] = cachedInfo.get(CACHE_KEYS.CONFEDERATIONS) ?? [];

      if (editionId === currentEdition) {
        console.log("Returning teams from cache");
        formattedTeams = cachedInfo.get(CACHE_KEYS.TEAMS) ?? [];
      }

      if (confederations.length === 0) {
        confederations = await getConfederationsFromCacheOrFetch(this.teamService);
      }

      if (formattedTeams.length === 0) {
        formattedTeams = await getTeamsFromCacheOrFetch(this.teamService, editionId);
      }

      return formattedTeams;
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("Getting by ID");
    await this.handleRequest(req, res, next, async () => {
      const teamId = req.params.teamId;
      const currentEdition = process.env.EDITION;
      console.log("Getting by ID", teamId, currentEdition);

      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      if (!teamId) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const team: ITeam = await this.teamService.getById(parseInt(teamId), parseInt(currentEdition));
      return team;
    });
  };
}
