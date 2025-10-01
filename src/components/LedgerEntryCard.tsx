"use client";

import { LedgerEntry } from "@/types/ledger";

interface LedgerEntryProps {
  entry: LedgerEntry;
}

export default function LedgerEntryCard({ entry }: LedgerEntryProps) {
  // Format amount for display
  const formatAmount = (amountCents: number) => {
    const amount = Math.abs(amountCents) / 100;
    const sign = amountCents >= 0 ? "+" : "-";
    return `${sign}$${amount.toFixed(2)}`;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get type display info
  const getTypeInfo = (type: string) => {
    switch (type) {
      case "WAGER_STAKE":
        return { label: "Wager Stake", color: "text-red-600" };
      case "WAGER_PAYOUT":
        return { label: "Wager Payout", color: "text-green-600" };
      case "WAGER_REFUND":
        return { label: "Wager Refund", color: "text-blue-600" };
      case "DEPOSIT":
        return { label: "Deposit", color: "text-green-600" };
      case "WITHDRAWAL":
        return { label: "Withdrawal", color: "text-red-600" };
      default:
        return { label: type, color: "text-gray-600" };
    }
  };

  const typeInfo = getTypeInfo(entry.type);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`font-semibold ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span
              className={`text-lg font-bold ${
                entry.amountCents >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatAmount(entry.amountCents)}
            </span>
          </div>
          <p className="text-gray-700 text-sm mb-2">{entry.description}</p>
          <div className="text-xs text-gray-500">
            <span>{formatDate(entry.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* User Information */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <h4 className="font-medium text-gray-900 mb-1">User</h4>
        <p className="text-sm text-gray-600">{entry.user.displayName}</p>
        <p className="text-xs text-gray-500">{entry.user.email}</p>
      </div>

      {/* Wager Information (if applicable) */}
      {entry.wager && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Related Wager</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Stake:</span>
              <span className="ml-2 font-medium">
                ${(entry.wager.stakeCents / 100).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span
                className={`ml-2 font-medium ${
                  entry.wager.status === "WON"
                    ? "text-green-600"
                    : entry.wager.status === "LOST"
                    ? "text-red-600"
                    : entry.wager.status === "PENDING"
                    ? "text-yellow-600"
                    : "text-gray-600"
                }`}
              >
                {entry.wager.status}
              </span>
            </div>
            {entry.wager.line && (
              <>
                <div>
                  <span className="text-gray-500">Line:</span>
                  <span className="ml-2 font-medium">
                    {entry.wager.line.selectionKey}{" "}
                    {entry.wager.line.point ? `${entry.wager.line.point}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Odds:</span>
                  <span className="ml-2 font-medium">
                    {entry.wager.line.price > 0 ? "+" : ""}
                    {entry.wager.line.price}
                  </span>
                </div>
                {entry.wager.line.market && (
                  <div className="md:col-span-2">
                    <span className="text-gray-500">Game:</span>
                    <span className="ml-2 font-medium">
                      {entry.wager.line.market.event.awayTeam} @{" "}
                      {entry.wager.line.market.event.homeTeam}
                    </span>
                    <span className="ml-2 text-gray-500">
                      ({entry.wager.line.market.type})
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
