// Type definitions for User entities
export interface User {
  id: string;
  email: string;
  displayName: string;
  balanceCents: number;
  createdAt: string;
  _count: {
    wagers: number;
  };
  wagers: Wager[];
  ledgerEntries: LedgerEntry[];
  name?: string; // Backwards compatibility - can be derived from displayName
}

// Wager type for user data
export interface Wager {
  id: string;
  stakeCents: number;
  acceptedPoint: number | null;
  acceptedPrice: number;
  placedAt: string;
  status: "PENDING" | "WON" | "LOST" | "PUSH" | "VOID";
  line: {
    id: string;
    selectionKey: "HOME" | "AWAY" | "OVER" | "UNDER";
    point: number | null;
    price: number;
    market: {
      id: string;
      type: "MONEYLINE" | "SPREAD" | "TOTAL";
      event: {
        id: string;
        homeTeam: string;
        awayTeam: string;
        startsAt: string;
        status: "SCHEDULED" | "LIVE" | "FINAL";
      };
    };
  };
  ledgerEntries: LedgerEntry[];
}

// Ledger entry type
export interface LedgerEntry {
  id: string;
  type:
    | "WAGER_STAKE"
    | "WAGER_PAYOUT"
    | "WAGER_REFUND"
    | "DEPOSIT"
    | "WITHDRAWAL";
  amountCents: number;
  description: string;
  createdAt: string;
  wagerId?: string | null;
}

// API response type for users endpoint
export interface UsersApiResponse {
  users: User[];
  count: number;
}
