import { logger } from "#logger/logger.service.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { IFifaMatch } from "./match.types";

/**
 * Configuration for the external API
 */
const API_CONFIG = {
  baseUrl: process.env.EXTERNAL_API_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds
};

/**
 * External API client for fetching match data
 */
export class MatchExternalAPI {
  /**
   * Fetch a specific match from the external API
   * @param matchId - The match ID to fetch
   * @returns The match data from the external API
   */
  async fetchMatch(matchId: number): Promise<IFifaMatch | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, API_CONFIG.timeout);

    try {
      const url = `${API_CONFIG.baseUrl}/${matchId}?language=pt-BR`;
      const response = await fetch(url, {
        headers: API_CONFIG.headers,
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AppError(
          `External API returned ${String(response.status)}: ${response.statusText}`,
          response.status,
          ErrorCode.EXTERNAL_SERVICE_ERROR,
        );
      }

      const data = (await response.json()) as IFifaMatch | null;

      logger.info({ matchId }, "Successfully fetched match from external API");
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("External API request timed out", 408, ErrorCode.EXTERNAL_SERVICE_ERROR);
      }

      if (error instanceof AppError) {
        throw error;
      }

      logger.error({ err: error }, "Error fetching match from external API");
      throw new AppError("Failed to fetch match from external API", 500, ErrorCode.EXTERNAL_SERVICE_ERROR);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Health check for the external API
   * @returns true if API is reachable, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000);

    try {
      const url = `${API_CONFIG.baseUrl}/health`;
      const response = await fetch(url, {
        headers: API_CONFIG.headers,
        method: "GET",
        signal: controller.signal,
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
