"use client";

import { useState, useEffect } from "react";
import BalanceChart from "@/components/BalanceChart";
import { User, UsersApiResponse } from "@/types/user";

export default function StatisticsPage() {
  const [users, setUsers] = useState<User[]>([]);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Balance Tracking
      </h1>

      {/* Balance Chart */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <BalanceChart users={users} />
      </div>
    </div>
  );
}
