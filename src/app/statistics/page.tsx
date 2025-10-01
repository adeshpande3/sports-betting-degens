"use client";

import { useState, useEffect } from "react";
import UserSelector from "@/components/UserSelector";
import BalanceChart from "@/components/BalanceChart";
import { User, UsersApiResponse } from "@/types/user";

export default function StatisticsPage() {
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

  // Get the selected user data
  const selectedUser = users.find((user) => user.id === selectedUserId);

  // Helper function to format balance from cents to dollars
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  // Calculate additional statistics for the selected user
  const calculateStats = (user: User) => {
    const settledWagers = user.wagers.filter((w) =>
      ["WON", "LOST", "PUSH", "VOID"].includes(w.status)
    );

    const record = {
      wins: user.wagers.filter((w) => w.status === "WON").length,
      losses: user.wagers.filter((w) => w.status === "LOST").length,
      pushes: user.wagers.filter((w) => w.status === "PUSH").length,
      voids: user.wagers.filter((w) => w.status === "VOID").length,
      pending: user.wagers.filter((w) => w.status === "PENDING").length,
    };

    const totalWagered = user.wagers.reduce((sum, w) => sum + w.stakeCents, 0);
    const totalWinnings = user.ledgerEntries
      .filter((entry) => entry.type === "WAGER_PAYOUT")
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    const winRate =
      settledWagers.length > 0 ? (record.wins / settledWagers.length) * 100 : 0;
    const profitLoss = totalWinnings - totalWagered;
    const roi = totalWagered > 0 ? (profitLoss / totalWagered) * 100 : 0;

    return {
      record,
      totalWagered,
      totalWinnings,
      profitLoss,
      winRate,
      roi,
      totalBets: user.wagers.length,
    };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 text-lg">Loading statistics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500 text-lg">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Statistics</h1>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <UserSelector
            users={users}
            selectedUserId={selectedUserId}
            onUserSelect={setSelectedUserId}
          />
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 text-lg">No user selected</div>
        </div>
      </div>
    );
  }

  const stats = calculateStats(selectedUser);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Statistics</h1>

      {/* User Selector */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select User
        </h2>
        <UserSelector
          users={users}
          selectedUserId={selectedUserId}
          onUserSelect={setSelectedUserId}
        />
      </div>

      {/* User Overview */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {selectedUser.displayName} - Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Balance */}
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatCurrency(selectedUser.balanceCents)}
            </div>
            <div className="text-sm text-gray-500">Current Balance</div>
          </div>

          {/* Total Bets */}
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {stats.totalBets}
            </div>
            <div className="text-sm text-gray-500">Total Bets</div>
          </div>

          {/* Win Rate */}
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Win Rate</div>
          </div>

          {/* ROI */}
          <div className="text-center">
            <div
              className={`text-2xl font-bold mb-1 ${
                stats.roi >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stats.roi >= 0 ? "+" : ""}
              {stats.roi.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">ROI</div>
          </div>
        </div>
      </div>

      {/* Betting Record */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Betting Record
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {stats.record.wins}
            </div>
            <div className="text-sm text-gray-500">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">
              {stats.record.losses}
            </div>
            <div className="text-sm text-gray-500">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-600">
              {stats.record.pushes}
            </div>
            <div className="text-sm text-gray-500">Pushes</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-600">
              {stats.record.voids}
            </div>
            <div className="text-sm text-gray-500">Voids</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {stats.record.pending}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Financial Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(stats.totalWagered)}
            </div>
            <div className="text-sm text-gray-500">Total Wagered</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(stats.totalWinnings)}
            </div>
            <div className="text-sm text-gray-500">Total Winnings</div>
          </div>
          <div className="text-center">
            <div
              className={`text-xl font-bold ${
                stats.profitLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stats.profitLoss >= 0 ? "+" : ""}
              {formatCurrency(stats.profitLoss)}
            </div>
            <div className="text-sm text-gray-500">Net Profit/Loss</div>
          </div>
        </div>
      </div>

      {/* Balance Chart */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <BalanceChart user={selectedUser} />
      </div>
    </div>
  );
}
