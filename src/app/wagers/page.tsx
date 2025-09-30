"use client";

import { useState, useEffect } from "react";
import WagerCard from "@/components/WagerCard";
import { Wager, WagersApiResponse } from "@/types/wager";

export default function Wagers() {
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Fetch wagers from API
  const fetchWagers = async (status?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/wagers", window.location.origin);
      if (status && status !== "ALL") {
        url.searchParams.set("status", status);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch wagers: ${response.statusText}`);
      }

      const data: WagersApiResponse = await response.json();

      if (data.success) {
        setWagers(data.wagers);
      } else {
        throw new Error("API returned unsuccessful response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setWagers([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchWagers();
  }, []);

  // Handle status filter change
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    fetchWagers(status);
  };

  // Status filter options
  const statusOptions = [
    { value: "ALL", label: "All Wagers" },
    { value: "PENDING", label: "Pending" },
    { value: "WON", label: "Won" },
    { value: "LOST", label: "Lost" },
    { value: "PUSH", label: "Push" },
    { value: "VOID", label: "Void" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-4">Wagers</h1>

        {/* Status Filter */}
        <div className="flex justify-center mb-6">
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Stats */}
        {!loading && !error && (
          <div className="text-center text-gray-600">
            Showing {wagers.length} wager{wagers.length !== 1 ? "s" : ""}
          </div>
        )}
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
            onClick={() => fetchWagers(selectedStatus)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && wagers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No wagers found</div>
          <div className="text-gray-400 text-sm">
            {selectedStatus === "ALL"
              ? "No wagers have been placed yet."
              : `No ${selectedStatus.toLowerCase()} wagers found.`}
          </div>
        </div>
      )}

      {/* Wagers Grid */}
      {!loading && !error && wagers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {wagers.map((wager) => (
            <WagerCard key={wager.id} wager={wager} />
          ))}
        </div>
      )}
    </div>
  );
}
