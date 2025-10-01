"use client";

import { useState, useEffect } from "react";
import LedgerEntryCard from "@/components/LedgerEntryCard";
import UserSelector from "@/components/UserSelector";
import { LedgerEntry, LedgerEntriesApiResponse } from "@/types/ledger";
import { User } from "@/types/user";

export default function Ledger() {
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Fetch all ledger entries from API
  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (selectedUserId !== "ALL") {
        params.append("userId", selectedUserId);
      }
      if (selectedType !== "ALL") {
        params.append("type", selectedType);
      }
      params.append("limit", "100"); // Set a reasonable limit

      const response = await fetch(`/api/ledger?${params.toString()}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch ledger entries: ${response.statusText}`
        );
      }

      const data: LedgerEntriesApiResponse = await response.json();

      if (data.success) {
        setAllEntries(data.entries);
      } else {
        throw new Error("API returned unsuccessful response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setAllEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLedgerEntries();
  }, [selectedUserId, selectedType]);

  // Handle user filter change
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  // Create users list with "All Users" option
  const usersWithAll = [
    {
      id: "ALL",
      name: "All Users",
      displayName: "All Users",
      email: "",
      balanceCents: 0,
      createdAt: new Date().toISOString(),
      _count: { wagers: 0 },
    },
    ...users,
  ];

  // Calculate total balance from entries
  const calculateTotalBalance = () => {
    return allEntries.reduce((total, entry) => total + entry.amountCents, 0);
  };

  const totalBalanceCents = calculateTotalBalance();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ledger</h1>
          <p className="text-gray-600">
            Transaction history and balance tracking
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User
              </label>
              <UserSelector
                users={usersWithAll}
                selectedUserId={selectedUserId}
                onUserSelect={handleUserSelect}
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="WAGER_STAKE">Wager Stake</option>
                <option value="WAGER_PAYOUT">Wager Payout</option>
                <option value="WAGER_REFUND">Wager Refund</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
              </select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {allEntries.length}
                </div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    totalBalanceCents >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {totalBalanceCents >= 0 ? "+" : "-"}$
                  {Math.abs(totalBalanceCents / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Net Balance Change</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  $
                  {Math.abs(
                    allEntries.reduce(
                      (total, entry) => total + Math.abs(entry.amountCents),
                      0
                    ) / 100
                  ).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Volume</div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading ledger entries...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Error Loading Ledger Entries
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchLedgerEntries}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Ledger Entries */}
        {!loading && !error && (
          <>
            {allEntries.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Ledger Entries Found
                </h3>
                <p className="text-gray-600">
                  No transaction history matches your current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allEntries.map((entry) => (
                  <LedgerEntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
