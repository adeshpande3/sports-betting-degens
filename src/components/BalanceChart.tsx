"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { User } from "@/types/user";

interface BalanceDataPoint {
  date: string;
  timestamp: number;
  [key: string]: number | string | boolean | undefined; // For dynamic user balance keys
}

interface UserBalanceData {
  user: User;
  color: string;
  balanceKey: string; // e.g., "user_123_balance"
  balanceInDollarsKey: string; // e.g., "user_123_balanceInDollars"
}

interface BalanceChartProps {
  user?: User; // For backward compatibility
  users?: User[]; // For multi-user support
}

// Color palette for different users
const USER_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
];

export default function BalanceChart({ user, users }: BalanceChartProps) {
  // Determine which users to process
  const usersToProcess = users || (user ? [user] : []);

  if (usersToProcess.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">No users provided</p>
      </div>
    );
  }

  // Create user data with colors and keys
  const userBalanceData: UserBalanceData[] = usersToProcess.map((u, index) => ({
    user: u,
    color: USER_COLORS[index % USER_COLORS.length],
    balanceKey: `user_${u.id}_balance`,
    balanceInDollarsKey: `user_${u.id}_balanceInDollars`,
  }));

  // Calculate balance history for single user
  const calculateSingleUserBalanceHistory = (
    user: User
  ): Array<{
    date: string;
    timestamp: number;
    balance: number;
    balanceInDollars: number;
    isBet: boolean;
    betType?: "win" | "loss" | "push" | "void";
    description?: string;
    userId: string;
  }> => {
    const points: Array<{
      date: string;
      timestamp: number;
      balance: number;
      balanceInDollars: number;
      isBet: boolean;
      betType?: "win" | "loss" | "push" | "void";
      description?: string;
      userId: string;
    }> = [];
    let runningBalance = 0;

    // Sort all ledger entries by creation date
    const sortedEntries = [...user.ledgerEntries].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Add starting point (assuming they started with 0 or some initial balance)
    if (sortedEntries.length > 0) {
      const firstEntryDate = new Date(sortedEntries[0].createdAt);
      const startDate = new Date(
        firstEntryDate.getTime() - 24 * 60 * 60 * 1000
      ); // Day before first entry

      points.push({
        date: startDate.toISOString().split("T")[0],
        timestamp: startDate.getTime(),
        balance: 0,
        balanceInDollars: 0,
        isBet: false,
        description: "Starting balance",
        userId: user.id,
      });
    }

    // Process each ledger entry
    sortedEntries.forEach((entry, index) => {
      runningBalance += entry.amountCents;

      const entryDate = new Date(entry.createdAt);
      const isBet =
        entry.type === "WAGER_STAKE" || entry.type === "WAGER_PAYOUT";

      let betType: "win" | "loss" | "push" | "void" | undefined;
      if (entry.wagerId && entry.type === "WAGER_PAYOUT") {
        // Find the associated wager
        const wager = user.wagers.find((w) => w.id === entry.wagerId);
        if (wager) {
          switch (wager.status) {
            case "WON":
              betType = "win";
              break;
            case "LOST":
              betType = "loss";
              break;
            case "PUSH":
              betType = "push";
              break;
            case "VOID":
              betType = "void";
              break;
          }
        }
      }

      points.push({
        date: entryDate.toISOString().split("T")[0],
        timestamp: entryDate.getTime(),
        balance: runningBalance,
        balanceInDollars: runningBalance / 100,
        isBet,
        betType,
        description: entry.description,
        userId: user.id,
      });
    });

    return points;
  };

  // Calculate combined balance history for multiple users
  const calculateCombinedBalanceHistory = (): BalanceDataPoint[] => {
    // Get all user balance histories
    const allUserHistories = userBalanceData.map((userData) => ({
      userData,
      history: calculateSingleUserBalanceHistory(userData.user),
    }));

    // Get all unique timestamps
    const allTimestamps = new Set<number>();
    allUserHistories.forEach(({ history }) => {
      history.forEach((point) => allTimestamps.add(point.timestamp));
    });

    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Create combined data points
    const combinedHistory: BalanceDataPoint[] = sortedTimestamps.map(
      (timestamp) => {
        const dataPoint: BalanceDataPoint = {
          date: new Date(timestamp).toISOString().split("T")[0],
          timestamp,
        };

        // For each user, find their balance at this timestamp
        allUserHistories.forEach(({ userData, history }) => {
          // Find the latest balance point at or before this timestamp
          let userBalance = 0;
          let userBalanceInDollars = 0;

          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].timestamp <= timestamp) {
              userBalance = history[i].balance;
              userBalanceInDollars = history[i].balanceInDollars;
              break;
            }
          }

          dataPoint[userData.balanceKey] = userBalance;
          dataPoint[userData.balanceInDollarsKey] = userBalanceInDollars;
        });

        return dataPoint;
      }
    );

    return combinedHistory;
  };

  // Calculate the combined balance history
  const balanceHistory = calculateCombinedBalanceHistory();

  // Custom tooltip component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    console.log("CustomTooltip - payload:", payload);
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-medium">{`Date: ${label}`}</p>
          {payload.map((entry: any, index: number) => {
            const userData = userBalanceData[index];
            if (!userData) return null;

            const balanceValue = entry.value;
            return (
              <p key={userData.user.id} className="text-sm">
                <span className="font-medium" style={{ color: userData.color }}>
                  {userData.user.displayName}:
                </span>
                <span
                  className={`ml-1 ${
                    (balanceValue || 0) >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  $
                  {typeof balanceValue === "number"
                    ? balanceValue.toFixed(2)
                    : "0.00"}
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom dot component for data points (not used in multi-user version)
  // We'll use regular dots for multi-user charts to keep it clean

  if (balanceHistory.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">No balance history available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-4">
        {usersToProcess.length === 1
          ? `${usersToProcess[0].displayName} - Balance Over Time`
          : "Balance Over Time (All Users)"}
      </h3>

      {/* Legend - Show users instead of bet types for multi-user charts */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        {usersToProcess.length > 1 ? (
          userBalanceData.map((userData) => (
            <div key={userData.user.id} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: userData.color }}
              ></div>
              <span>{userData.user.displayName}</span>
            </div>
          ))
        ) : (
          // Show bet types for single user
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Win</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Loss</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Push</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Bet Placed</span>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={balanceHistory}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Render a line for each user */}
            {userBalanceData.map((userData) => (
              <Line
                key={userData.user.id}
                type="monotone"
                dataKey={userData.balanceInDollarsKey}
                stroke={userData.color}
                strokeWidth={2}
                dot={{ r: 3, fill: userData.color }}
                activeDot={{
                  r: 6,
                  stroke: userData.color,
                  strokeWidth: 2,
                  fill: "white",
                }}
                connectNulls={false}
              />
            ))}

            {/* Reference line at $0 */}
            <Line
              type="monotone"
              dataKey={() => 0}
              stroke="#9CA3AF"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-gray-900">
            $
            {(() => {
              const allBalances = userBalanceData.flatMap((userData) =>
                balanceHistory
                  .map((p) => p[userData.balanceInDollarsKey] as number)
                  .filter((val) => typeof val === "number")
              );
              return allBalances.length > 0
                ? Math.max(...allBalances).toFixed(2)
                : "0.00";
            })()}
          </div>
          <div className="text-xs text-gray-500">Peak Balance</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900">
            $
            {(() => {
              const allBalances = userBalanceData.flatMap((userData) =>
                balanceHistory
                  .map((p) => p[userData.balanceInDollarsKey] as number)
                  .filter((val) => typeof val === "number")
              );
              return allBalances.length > 0
                ? Math.min(...allBalances).toFixed(2)
                : "0.00";
            })()}
          </div>
          <div className="text-xs text-gray-500">Lowest Balance</div>
        </div>
      </div>
    </div>
  );
}
