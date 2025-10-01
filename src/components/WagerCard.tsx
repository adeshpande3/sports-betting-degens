"use client";

import { Wager } from "@/types/wager";

interface WagerCardProps {
  wager: Wager;
  onMarkWin?: (wagerId: string) => void;
  onMarkLoss?: (wagerId: string) => void;
  onMarkPush?: (wagerId: string) => void;
  onMarkVoid?: (wagerId: string) => void;
}

export default function WagerCard({
  wager,
  onMarkWin,
  onMarkLoss,
  onMarkPush,
  onMarkVoid,
}: WagerCardProps) {
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
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between gap-4">
        {/* Left Section - Game Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {wager.event.awayTeam} @ {wager.event.homeTeam}
            </h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                wager.status
              )}`}
            >
              {wager.status}
            </span>
          </div>
          <p className="text-sm text-gray-600">{wager.event.league}</p>
        </div>

        {/* Middle Section - Bet Details */}
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-gray-600 mb-1">{getMarketTypeDisplay()}</p>
            <p className="font-medium">{getSelectionText()}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-1">Odds</p>
            <p className="font-medium">{formatOdds(wager.acceptedPrice)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-1">Stake</p>
            <p className="font-medium">{formatCurrency(wager.stakeCents)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-1">Potential</p>
            <p className="font-medium text-green-600">
              {formatCurrency(wager.potentialPayoutCents)}
            </p>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          <div className="text-right text-sm mr-4">
            <p className="text-gray-600">{wager.user.displayName}</p>
            <p className="text-gray-500 text-xs">
              {formatDateTime(wager.placedAt)}
            </p>
          </div>

          {/* Action Buttons - Only show for PENDING wagers */}
          {wager.status === "PENDING" &&
            (onMarkWin || onMarkLoss || onMarkPush || onMarkVoid) && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {onMarkWin && (
                    <button
                      onClick={() => onMarkWin(wager.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                    >
                      Win
                    </button>
                  )}
                  {onMarkLoss && (
                    <button
                      onClick={() => onMarkLoss(wager.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                    >
                      Loss
                    </button>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
