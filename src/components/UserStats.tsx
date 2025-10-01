"use client";

import { useState, useEffect } from "react";
import UserSelector from "./UserSelector";
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
        <div className="text-sm text-gray-500">Available Balance</div>
      </div>

      {/* User Details */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 mb-3">User Details</h3>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Email:</span>
          <span className="text-sm font-medium">{selectedUser.email}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">User ID:</span>
          <span className="text-sm font-medium font-mono">
            {selectedUser.id}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Member Since:</span>
          <span className="text-sm font-medium">
            {formatDate(selectedUser.createdAt)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Wagers:</span>
          <span className="text-sm font-medium">
            {selectedUser._count.wagers}
          </span>
        </div>
      </div>
    </div>
  );
}
