// Type definitions for Wager API responses
export interface WagerUser {
  displayName: string;
  email: string;
}

export interface WagerEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  status: "SCHEDULED" | "LIVE" | "FINAL";
  league: string;
}

export interface WagerMarket {
  type: "MONEYLINE" | "SPREAD" | "TOTAL";
}

export interface WagerLine {
  id: string;
  point: string | null;
  price: number;
  source: string;
  capturedAt: string;
}

export interface Wager {
  id: string;
  userId: string;
  user: WagerUser;
  stakeCents: number;
  acceptedPrice: number;
  acceptedPoint: string | null;
  status: "PENDING" | "WON" | "LOST" | "PUSH" | "VOID";
  placedAt: string;
  potentialPayoutCents: number;
  event: WagerEvent;
  market: WagerMarket;
  selection: "HOME" | "AWAY" | "OVER" | "UNDER";
  line: WagerLine;
}

export interface WagersApiResponse {
  success: boolean;
  wagers: Wager[];
  count: number;
}
