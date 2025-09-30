"use client";

import { Wager } from "@/types/wager";

interface WagerCardProps {
  wager: Wager;
}

export default function WagerCard({ wager }: WagerCardProps) {
  // Helper functions
  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "WON":
        return "bg-green-100 text-green-800";
      case "LOST":
        return "bg-red-100 text-red-800";
      case "PUSH":
        return "bg-gray-100 text-gray-800";
      case "VOID":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSelectionText = (): string => {
    const { selection, market, event, acceptedPoint } = wager;

    switch (market.type) {
      case "SPREAD":
        if (selection === "HOME") {
          return `${event.homeTeam} ${acceptedPoint}`;
        } else {
          return `${event.awayTeam} ${acceptedPoint}`;
        }
      case "MONEYLINE":
        return selection === "HOME" ? event.homeTeam : event.awayTeam;
      case "TOTAL":
        return `${selection} ${acceptedPoint}`;
      default:
        return `${selection}`;
    }
  };

  const getMarketTypeDisplay = (): string => {
    switch (wager.market.type) {
      case "SPREAD":
        return "Point Spread";
      case "MONEYLINE":
        return "Moneyline";
      case "TOTAL":
        return "Total Points";
      default:
        return wager.market.type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {wager.event.awayTeam} @ {wager.event.homeTeam}
          </h3>
          <p className="text-sm text-gray-600">{wager.event.league}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
            wager.status
          )}`}
        >
          {wager.status}
        </span>
      </div>

      {/* Bet Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Market Type</p>
          <p className="font-medium">{getMarketTypeDisplay()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Selection</p>
          <p className="font-medium">{getSelectionText()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Odds</p>
          <p className="font-medium">{formatOdds(wager.acceptedPrice)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Stake</p>
          <p className="font-medium">{formatCurrency(wager.stakeCents)}</p>
        </div>
      </div>

      {/* Payout Information */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Potential Payout</span>
          <span className="font-bold text-lg text-green-600">
            {formatCurrency(wager.potentialPayoutCents)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-600">Potential Profit</span>
          <span className="font-medium text-green-600">
            {formatCurrency(wager.potentialPayoutCents - wager.stakeCents)}
          </span>
        </div>
      </div>

      {/* Event & Timing Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Game Time</p>
          <p className="font-medium">{formatDateTime(wager.event.startsAt)}</p>
        </div>
        <div>
          <p className="text-gray-600">Placed At</p>
          <p className="font-medium">{formatDateTime(wager.placedAt)}</p>
        </div>
      </div>

      {/* User Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Bettor</span>
          <span className="font-medium">{wager.user.displayName}</span>
        </div>
      </div>

      {/* Wager ID for reference */}
      <div className="mt-2 text-xs text-gray-400">ID: {wager.id.slice(-8)}</div>
    </div>
  );
}
