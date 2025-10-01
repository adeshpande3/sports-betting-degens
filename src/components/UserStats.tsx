"use client";

import { useState, useEffect } from "react";
import UserSelector from "./UserSelector";
import BalanceChart from "./BalanceChart";
import { User, UsersApiResponse } from "@/types/user";

interface UserStatsProps {
  // Remove userId prop since we'll manage selection internally
}

export default function UserStats({}: UserStatsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users from API
  const fetchUsers = async (): Promise<User[]> => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      const data: UsersApiResponse = await response.json();
      return data.users;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedUsers = await fetchUsers();
        setUsers(fetchedUsers);

        // Set the first user as selected by default
        if (fetchedUsers.length > 0 && !selectedUserId) {
          setSelectedUserId(fetchedUsers[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Get the selected user data from the real API data
  const selectedUser = users.find((user) => user.id === selectedUserId);

  // Helper function to format balance from cents to dollars
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate betting statistics for a user
  const calculateBettingStats = (user: User) => {
    const settledWagers = user.wagers.filter((w) =>
      ["WON", "LOST", "PUSH", "VOID"].includes(w.status)
    );

    const record = {
      wins: user.wagers.filter((w) => w.status === "WON").length,
      losses: user.wagers.filter((w) => w.status === "LOST").length,
      pushes: user.wagers.filter((w) => w.status === "PUSH").length,
      voids: user.wagers.filter((w) => w.status === "VOID").length,
    };

    const totalWagered = user.wagers.reduce((sum, w) => sum + w.stakeCents, 0);

    // Calculate total winnings from payout ledger entries
    const totalWinnings = user.ledgerEntries
      .filter((entry) => entry.type === "WAGER_PAYOUT")
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    const winRate =
      settledWagers.length > 0 ? (record.wins / settledWagers.length) * 100 : 0;

    const averageBet =
      user.wagers.length > 0 ? totalWagered / user.wagers.length : 0;

    // Find biggest win and loss from payout amounts
    const payouts = user.ledgerEntries.filter(
      (entry) => entry.type === "WAGER_PAYOUT"
    );
    const biggestWin =
      payouts.length > 0 ? Math.max(...payouts.map((p) => p.amountCents)) : 0;

    const stakes = user.wagers.map((w) => w.stakeCents);
    const biggestLoss = stakes.length > 0 ? Math.max(...stakes) : 0;

    // Recent form (last 8 wagers)
    const recentWagers = user.wagers.slice(0, 8);
    const recentForm = recentWagers.map((w) => {
      switch (w.status) {
        case "WON":
          return "W";
        case "LOST":
          return "L";
        case "PUSH":
          return "P";
        case "VOID":
          return "V";
        default:
          return "P"; // Pending
      }
    });

    // Find favorite team (most bet on)
    const teamBets = user.wagers.reduce((acc, wager) => {
      const homeTeam = wager.line.market.event.homeTeam;
      const awayTeam = wager.line.market.event.awayTeam;

      // Determine which team was bet on based on selection
      let betTeam = "";
      if (wager.line.selectionKey === "HOME") {
        betTeam = homeTeam;
      } else if (wager.line.selectionKey === "AWAY") {
        betTeam = awayTeam;
      } else {
        // For OVER/UNDER, we'll count both teams
        betTeam = `${homeTeam} vs ${awayTeam}`;
      }

      acc[betTeam] = (acc[betTeam] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteTeam =
      Object.entries(teamBets).length > 0
        ? Object.entries(teamBets).sort(([, a], [, b]) => b - a)[0][0]
        : "None";

    return {
      record,
      totalWagered,
      totalWinnings,
      winRate,
      averageBet,
      biggestWin,
      biggestLoss,
      recentForm,
      favoriteTeam,
    };
  };

  // Early return for loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sticky top-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Loading users...</div>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sticky top-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  // Early return if no users or no selected user
  if (!selectedUser) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sticky top-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">No user selected</div>
        </div>
      </div>
    );
  }

  // Calculate betting statistics for the selected user
  const stats = calculateBettingStats(selectedUser);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sticky top-4">
      {/* User Selector */}
      <div className="mb-6">
        <UserSelector
          users={users}
          selectedUserId={selectedUserId}
          onUserSelect={setSelectedUserId}
        />
      </div>

      {/* User Info */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {selectedUser.displayName}
        </h2>
        <div className="text-3xl font-bold text-green-600 mb-1">
          {formatCurrency(selectedUser.balanceCents)}
        </div>
      </div>
      {/* Recent Form */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Recent Form</h3>
        <div className="flex space-x-1">
          {stats.recentForm.map((result, index) => (
            <div
              key={index}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                result === "W"
                  ? "bg-green-500"
                  : result === "L"
                  ? "bg-red-500"
                  : result === "P"
                  ? "bg-yellow-500"
                  : result === "V"
                  ? "bg-gray-500"
                  : "bg-blue-500"
              }`}
            >
              {result}
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1">Most recent on left</div>
      </div>

      {/* Betting Statistics */}
      <div className="space-y-4">
        {/* Record */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Betting Record</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">
                {stats.record.wins}
              </div>
              <div className="text-xs text-gray-500">Wins</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {stats.record.losses}
              </div>
              <div className="text-xs text-gray-500">Losses</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {stats.record.pushes}
              </div>
              <div className="text-xs text-gray-500">Pushes</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Performance</h3>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Win Rate:</span>
            <span className="text-sm font-medium">
              {stats.winRate.toFixed(1)}%
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Wagered:</span>
            <span className="text-sm font-medium">
              {formatCurrency(stats.totalWagered)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Winnings:</span>
            <span className="text-sm font-medium">
              {formatCurrency(stats.totalWinnings)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Net P&L:</span>
            <span
              className={`text-sm font-medium ${
                stats.totalWinnings - stats.totalWagered >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(stats.totalWinnings - stats.totalWagered)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Biggest Win:</span>
            <span className="text-sm font-medium text-green-600">
              {formatCurrency(stats.biggestWin)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Biggest Loss:</span>
            <span className="text-sm font-medium text-red-600">
              {formatCurrency(stats.biggestLoss)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
