/**
 * Type definitions and utilities for The Odds API integration
 */

import { z } from "zod";

// Zod schemas for request validation
export const SyncOddsRequestSchema = z.object({
  sport: z.string().default("americanfootball_nfl"),
  markets: z.string().default("h2h,spreads,totals"),
  regions: z.string().default("us"),
  oddsFormat: z.enum(["american", "decimal"]).default("american"),
});

export type SyncOddsRequest = z.infer<typeof SyncOddsRequestSchema>;

// Response types
export interface SyncOddsResponse {
  success: true;
  message: string;
  data: {
    eventsCreated: number;
    linesCreated: number;
    totalGamesProcessed: number;
    apiRemainingRequests?: string;
    apiUsedRequests?: string;
  };
}

export interface SyncStatsResponse {
  success: true;
  stats: {
    totalEvents: number;
    totalLines: number;
    recentEvents: number;
    recentLines: number;
  };
  apiKeyConfigured: boolean;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
  };
}

// Odds API raw response types
export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiMarket {
  key: string;
  last_update: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

// Popular sport keys for The Odds API
export const POPULAR_SPORTS = {
  // American Football
  NFL: "americanfootball_nfl",
  NCAAF: "americanfootball_ncaaf",

  // Basketball
  NBA: "basketball_nba",
  NCAAB: "basketball_ncaab",

  // Baseball
  MLB: "baseball_mlb",

  // Hockey
  NHL: "icehockey_nhl",

  // Soccer
  EPL: "soccer_epl",
  MLS: "soccer_usa_mls",

  // Tennis
  ATP: "tennis_atp",
  WTA: "tennis_wta",
} as const;

// Market type constants
export const MARKET_TYPES = {
  MONEYLINE: "h2h",
  SPREAD: "spreads",
  TOTAL: "totals",
  PLAYER_PROPS: "player_props",
} as const;

// Helper functions
export function isValidSport(sport: string): boolean {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(POPULAR_SPORTS).includes(sport as any) ||
    sport === "americanfootball_nfl"
  );
}

export function buildMarketsString(
  markets: (keyof typeof MARKET_TYPES)[]
): string {
  return markets.map((m) => MARKET_TYPES[m]).join(",");
}

// Client-side fetch utilities
export class OddsApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/odds") {
    this.baseUrl = baseUrl;
  }

  async syncOdds(
    request: SyncOddsRequest
  ): Promise<SyncOddsResponse | ApiErrorResponse> {
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    return response.json();
  }

  async getStats(): Promise<SyncStatsResponse | ApiErrorResponse> {
    const response = await fetch(`${this.baseUrl}/sync?stats=true`);
    return response.json();
  }

  async checkStatus(): Promise<{
    success: boolean;
    apiKeyConfigured: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/sync`);
    return response.json();
  }
}

// Example usage:
// const client = new OddsApiClient();
// const result = await client.syncOdds({
//   sport: POPULAR_SPORTS.NFL,
//   markets: buildMarketsString(["MONEYLINE", "SPREAD", "TOTAL"])
// });
