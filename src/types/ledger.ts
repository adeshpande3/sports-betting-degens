// Type definitions for LedgerEntry entities
export interface LedgerEntry {
  id: string;
  userId: string;
  wagerId: string | null;
  type:
    | "WAGER_STAKE"
    | "WAGER_PAYOUT"
    | "WAGER_REFUND"
    | "DEPOSIT"
    | "WITHDRAWAL";
  amountCents: number;
  description: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
  wager: {
    id: string;
    stakeCents: number;
    acceptedPoint: string | null;
    acceptedPrice: number;
    placedAt: string;
    status: "PENDING" | "WON" | "LOST" | "PUSH" | "VOID";
    line: {
      id: string;
      selectionKey: "HOME" | "AWAY" | "OVER" | "UNDER";
      point: string | null;
      price: number;
      source: string;
      capturedAt: string;
      market: {
        id: string;
        type: "MONEYLINE" | "SPREAD" | "TOTAL";
        event: {
          id: string;
          homeTeam: string;
          awayTeam: string;
          startsAt: string;
          status: "SCHEDULED" | "LIVE" | "FINAL";
          league: {
            id: string;
            name: string;
          };
        };
      };
    } | null;
  } | null;
}

// API response type for ledger entries endpoint
export interface LedgerEntriesApiResponse {
  success: boolean;
  entries: LedgerEntry[];
  count: number;
  total: number;
}

// Query parameters for filtering ledger entries
export interface LedgerEntryFilters {
  userId?: string;
  type?:
    | "WAGER_STAKE"
    | "WAGER_PAYOUT"
    | "WAGER_REFUND"
    | "DEPOSIT"
    | "WITHDRAWAL";
  wagerId?: string;
  limit?: number;
}
