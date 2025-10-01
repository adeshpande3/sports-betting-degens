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
  balance: number;
  balanceInDollars: number;
  isBet: boolean;
  betType?: "win" | "loss" | "push" | "void";
  description?: string;
}

interface BalanceChartProps {
  user: User;
}

export default function BalanceChart({ user }: BalanceChartProps) {
  // Calculate balance history from ledger entries
  const calculateBalanceHistory = (user: User): BalanceDataPoint[] => {
    const points: BalanceDataPoint[] = [];
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
      });
    });

    return points;
  };

  const balanceHistory = calculateBalanceHistory(user);

  // Custom tooltip component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-medium">{`Date: ${data.date}`}</p>
          <p className="text-sm">
            <span className="font-medium">Balance: </span>
            <span
              className={`${
                data.balanceInDollars >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ${data.balanceInDollars.toFixed(2)}
            </span>
          </p>
          {data.description && (
            <p className="text-xs text-gray-600 mt-1">{data.description}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom dot component for data points
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;

    if (!payload.isBet) return null;

    let color = "#3B82F6"; // Default blue
    if (payload.betType === "win") color = "#10B981"; // Green
    else if (payload.betType === "loss") color = "#EF4444"; // Red
    else if (payload.betType === "push") color = "#F59E0B"; // Yellow
    else if (payload.betType === "void") color = "#6B7280"; // Gray

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke="white"
        strokeWidth={2}
        className="opacity-80 hover:opacity-100"
      />
    );
  };

  if (balanceHistory.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">No balance history available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Balance Over Time</h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
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
              domain={["dataMin - 50", "dataMax + 50"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="balanceInDollars"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{
                r: 6,
                stroke: "#3B82F6",
                strokeWidth: 2,
                fill: "white",
              }}
            />
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
            {Math.max(...balanceHistory.map((p) => p.balanceInDollars)).toFixed(
              2
            )}
          </div>
          <div className="text-xs text-gray-500">Peak Balance</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900">
            $
            {Math.min(...balanceHistory.map((p) => p.balanceInDollars)).toFixed(
              2
            )}
          </div>
          <div className="text-xs text-gray-500">Lowest Balance</div>
        </div>
      </div>
    </div>
  );
}
