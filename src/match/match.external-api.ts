import type { IMatchRaw } from "#match/match.types.js";

import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";

/**
 * External API response structure for matches
 * Adjust this interface based on your actual external API response
 */
export interface IExternalMatchResponse {
  data: IMatchRaw[];
  success: boolean;
}

/**
 * Configuration for the external API
 */
const API_CONFIG = {
  baseUrl: process.env.EXTERNAL_API_URL ?? "https://api.example.com",
  headers: {
    "Content-Type": "application/json",
    ...(process.env.EXTERNAL_API_KEY && {
      Authorization: `Bearer ${process.env.EXTERNAL_API_KEY}`,
    }),
  },
  timeout: 10000, // 10 seconds
};

/**
 * External API client for fetching match data
 */
export class MatchExternalAPI {
  /**
   * Fetch all matches for a specific edition from the external API
   * @param editionId - The edition ID to fetch matches for
   * @returns Array of matches from the external API
   */
  async fetchMatches(editionId: number): Promise<IMatchRaw[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, API_CONFIG.timeout);

    try {
      console.log(`[External API] Fetching matches for edition ${String(editionId)}...`);

      const url = `${API_CONFIG.baseUrl}/matches?edition=${String(editionId)}`;
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

      const data = (await response.json()) as IExternalMatchResponse;

      if (!data.success || !Array.isArray(data.data)) {
        throw new AppError("Invalid response format from external API", 500, ErrorCode.EXTERNAL_SERVICE_ERROR);
      }

      console.log(`[External API] Successfully fetched ${String(data.data.length)} matches`);
      return data.data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("External API request timed out", 408, ErrorCode.EXTERNAL_SERVICE_ERROR);
      }

      if (error instanceof AppError) {
        throw error;
      }

      console.error("[External API] Error fetching matches:", error);
      throw new AppError("Failed to fetch matches from external API", 500, ErrorCode.EXTERNAL_SERVICE_ERROR);
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
