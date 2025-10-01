"use client";

import { useState, useRef, useEffect } from "react";
import { Wager } from "@/types/wager";

interface WagerCardProps {
  wager: Wager;
  onMarkWin?: (wagerId: string) => void;
  onMarkLoss?: (wagerId: string) => void;
  onMarkPush?: (wagerId: string) => void;
  onMarkVoid?: (wagerId: string) => void;
  onCancel?: (wagerId: string) => void;
}

export default function WagerCard({
  wager,
  onMarkWin,
  onMarkLoss,
  onMarkPush,
  onMarkVoid,
  onCancel,
}: WagerCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
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

  const isEventStarted = (): boolean => {
    const currentTime = new Date();
    const eventStartTime = new Date(wager.event.startsAt);
    return currentTime >= eventStartTime;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between gap-4">
        {/* Left Section - Game Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900">
                <div>{wager.event.awayTeam}</div>
                <div>@ {wager.event.homeTeam}</div>
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                wager.status
              )}`}
            >
              {wager.status}
            </span>
          </div>
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
            (onMarkWin ||
              onMarkLoss ||
              onMarkPush ||
              onMarkVoid ||
              onCancel) && (
              <div className="flex gap-2">
                {onMarkWin && (
                  <button
                    onClick={() => onMarkWin(wager.id)}
                    disabled={!isEventStarted()}
                    className={`px-3 py-1 text-white text-sm font-medium rounded transition-colors ${
                      isEventStarted()
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    title={
                      !isEventStarted()
                        ? "Event hasn't started yet"
                        : "Mark as Win"
                    }
                  >
                    Win
                  </button>
                )}
                {onMarkLoss && (
                  <button
                    onClick={() => onMarkLoss(wager.id)}
                    disabled={!isEventStarted()}
                    className={`px-3 py-1 text-white text-sm font-medium rounded transition-colors ${
                      isEventStarted()
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    title={
                      !isEventStarted()
                        ? "Event hasn't started yet"
                        : "Mark as Loss"
                    }
                  >
                    Loss
                  </button>
                )}
                {(onMarkPush || onMarkVoid || onCancel) && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="px-3 py-1 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors flex items-center gap-1"
                    >
                      More
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-24 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                        <div className="py-1">
                          {onMarkPush && (
                            <button
                              onClick={() => {
                                if (isEventStarted()) {
                                  onMarkPush(wager.id);
                                  setIsDropdownOpen(false);
                                }
                              }}
                              disabled={!isEventStarted()}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                isEventStarted()
                                  ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                                  : "text-gray-400 cursor-not-allowed"
                              }`}
                              title={
                                !isEventStarted()
                                  ? "Event hasn't started yet"
                                  : "Mark as Push"
                              }
                            >
                              Push
                            </button>
                          )}
                          {onMarkVoid && (
                            <button
                              onClick={() => {
                                if (isEventStarted()) {
                                  onMarkVoid(wager.id);
                                  setIsDropdownOpen(false);
                                }
                              }}
                              disabled={!isEventStarted()}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                isEventStarted()
                                  ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                                  : "text-gray-400 cursor-not-allowed"
                              }`}
                              title={
                                !isEventStarted()
                                  ? "Event hasn't started yet"
                                  : "Mark as Void"
                              }
                            >
                              Void
                            </button>
                          )}
                          {onCancel && (
                            <button
                              onClick={() => {
                                onCancel(wager.id);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
