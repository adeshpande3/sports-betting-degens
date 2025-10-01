"use client";

import { useState, useEffect } from "react";
import WagerCard from "@/components/WagerCard";
import UserSelector from "@/components/UserSelector";
import { Wager, WagersApiResponse } from "@/types/wager";
import { User } from "@/types/user";

export default function Wagers() {
  const [allWagers, setAllWagers] = useState<Wager[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");

  // Fetch all wagers from API
  const fetchWagers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/wagers");

      if (!response.ok) {
        throw new Error(`Failed to fetch wagers: ${response.statusText}`);
      }

      const data: WagersApiResponse = await response.json();

      if (data.success) {
        setAllWagers(data.wagers);
      } else {
        throw new Error("API returned unsuccessful response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setAllWagers([]);
    } finally {
      setLoading(false);
    }
  };

  // TODO - consolidate with the other usage
  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const data = await response.json();
      setUsers(data.users || []);

      // Set default selected user to "ALL" or first user if users exist
      if (data.users && data.users.length > 0) {
        setSelectedUserId("ALL");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      // Don't set error state for users fetch failure, just log it
    }
  };

  // Initial load
  useEffect(() => {
    fetchWagers();
    fetchUsers();
  }, []);

  // Handle user filter change
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  // Handle marking wager as won
  const handleMarkWin = async (wagerId: string) => {
    try {
      const response = await fetch(`/api/wagers/${wagerId}/mark-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ result: "WON" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to mark wager as won"
        );
      }

      const data = await response.json();
      console.log("Wager marked as won:", data);

      // Refetch wagers to update UI
      await fetchWagers();
    } catch (err) {
      console.error("Error marking wager as won:", err);
      setError(
        err instanceof Error ? err.message : "Failed to mark wager as won"
      );
    }
  };

  // Handle marking wager as lost
  const handleMarkLoss = async (wagerId: string) => {
    try {
      const response = await fetch(`/api/wagers/${wagerId}/mark-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ result: "LOST" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to mark wager as lost"
        );
      }

      const data = await response.json();
      console.log("Wager marked as lost:", data);

      // Refetch wagers to update UI
      await fetchWagers();
    } catch (err) {
      console.error("Error marking wager as lost:", err);
      setError(
        err instanceof Error ? err.message : "Failed to mark wager as lost"
      );
    }
  };

  // Handle marking wager as push (tie)
  const handleMarkPush = async (wagerId: string) => {
    try {
      const response = await fetch(`/api/wagers/${wagerId}/mark-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ result: "PUSH" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to mark wager as push"
        );
      }

      const data = await response.json();
      console.log("Wager marked as push:", data);

      // Refetch wagers to update UI
      await fetchWagers();
    } catch (err) {
      console.error("Error marking wager as push:", err);
      setError(
        err instanceof Error ? err.message : "Failed to mark wager as push"
      );
    }
  };

  // Handle marking wager as void (cancelled)
  const handleMarkVoid = async (wagerId: string) => {
    try {
      const response = await fetch(`/api/wagers/${wagerId}/mark-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ result: "VOID" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to mark wager as void"
        );
      }

      const data = await response.json();
      console.log("Wager marked as void:", data);

      // Refetch wagers to update UI
      await fetchWagers();
    } catch (err) {
      console.error("Error marking wager as void:", err);
      setError(
        err instanceof Error ? err.message : "Failed to mark wager as void"
      );
    }
  };

  // Filter wagers based on selected user
  const filteredWagers =
    selectedUserId === "ALL"
      ? allWagers
      : allWagers.filter((wager) => wager.userId === selectedUserId);

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-4">Wagers</h1>

        {/* User Filter */}
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-2xl">
            <UserSelector
              users={usersWithAll}
              selectedUserId={selectedUserId}
              onUserSelect={handleUserSelect}
              className="justify-center"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-800 font-medium mb-2">
            Error Loading Wagers
          </div>
          <div className="text-red-600 text-sm mb-4">{error}</div>
          <button
            onClick={() => fetchWagers()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredWagers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No wagers found</div>
          <div className="text-gray-400 text-sm">
            {selectedUserId === "ALL"
              ? "No wagers have been placed yet."
              : `No wagers found for ${
                  users.find((u) => u.id === selectedUserId)?.displayName ||
                  users.find((u) => u.id === selectedUserId)?.name
                }.`}
          </div>
        </div>
      )}

      {/* Wagers List */}
      {!loading && !error && filteredWagers.length > 0 && (
        <div className="space-y-4 max-w-6xl mx-auto">
          {filteredWagers.map((wager) => (
            <WagerCard
              key={wager.id}
              wager={wager}
              onMarkWin={handleMarkWin}
              onMarkLoss={handleMarkLoss}
              onMarkPush={handleMarkPush}
              onMarkVoid={handleMarkVoid}
            />
          ))}
        </div>
      )}
    </div>
  );
}
