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
  name?: string; // Backwards compatibility - can be derived from displayName
}

// API response type for users endpoint
export interface UsersApiResponse {
  users: User[];
  count: number;
}
