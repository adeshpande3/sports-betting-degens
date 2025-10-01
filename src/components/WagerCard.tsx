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

  // Helper function to render Win button
  const renderWinButton = (isMobile: boolean = false) => {
    if (!onMarkWin) return null;

    const buttonClasses = isMobile
      ? "px-2 py-1 text-white text-xs font-medium rounded transition-colors"
      : "px-3 py-1 text-white text-sm font-medium rounded transition-colors";

    return (
      <button
        onClick={() => onMarkWin(wager.id)}
        disabled={!isEventStarted()}
        className={`${buttonClasses} ${
          isEventStarted()
            ? "bg-green-600 hover:bg-green-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
        title={!isEventStarted() ? "Event hasn't started yet" : "Mark as Win"}
      >
        Win
      </button>
    );
  };

  // Helper function to render Loss button
  const renderLossButton = (isMobile: boolean = false) => {
    if (!onMarkLoss) return null;

    const buttonClasses = isMobile
      ? "px-2 py-1 text-white text-xs font-medium rounded transition-colors"
      : "px-3 py-1 text-white text-sm font-medium rounded transition-colors";

    return (
      <button
        onClick={() => onMarkLoss(wager.id)}
        disabled={!isEventStarted()}
        className={`${buttonClasses} ${
          isEventStarted()
            ? "bg-red-600 hover:bg-red-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
        title={!isEventStarted() ? "Event hasn't started yet" : "Mark as Loss"}
      >
        Loss
      </button>
    );
  };

  // Helper function to render dropdown menu items
  const renderDropdownItems = (isMobile: boolean = false) => {
    const itemClasses = isMobile
      ? "w-full text-left px-2 py-1 text-xs transition-colors"
      : "w-full text-left px-3 py-2 text-sm transition-colors";

    const cancelClasses = isMobile
      ? "w-full text-left px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 transition-colors"
      : "w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors";

    return (
      <>
        {onMarkPush && (
          <button
            onClick={() => {
              if (isEventStarted()) {
                onMarkPush(wager.id);
                setIsDropdownOpen(false);
              }
            }}
            disabled={!isEventStarted()}
            className={`${itemClasses} ${
              isEventStarted()
                ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                : "text-gray-400 cursor-not-allowed"
            }`}
            title={
              !isEventStarted() ? "Event hasn't started yet" : "Mark as Push"
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
            className={`${itemClasses} ${
              isEventStarted()
                ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                : "text-gray-400 cursor-not-allowed"
            }`}
            title={
              !isEventStarted() ? "Event hasn't started yet" : "Mark as Void"
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
            className={cancelClasses}
          >
            Cancel
          </button>
        )}
      </>
    );
  };

  // Helper function to render More dropdown button
  const renderMoreDropdown = (isMobile: boolean = false) => {
    if (!onMarkPush && !onMarkVoid && !onCancel) return null;

    const buttonClasses = isMobile
      ? "px-2 py-1 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors flex items-center gap-1"
      : "px-3 py-1 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors flex items-center gap-1";

    const iconClasses = isMobile ? "w-3 h-3" : "w-4 h-4";
    const dropdownClasses = isMobile ? "w-20" : "w-24";

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={buttonClasses}
        >
          More
          <svg
            className={`${iconClasses} transition-transform ${
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

        {isDropdownOpen && (
          <div
            className={`absolute right-0 mt-1 ${dropdownClasses} bg-white border border-gray-200 rounded-md shadow-lg z-10`}
          >
            <div className="py-1">{renderDropdownItems(isMobile)}</div>
          </div>
        )}
      </div>
    );
  };

  // Helper function to render all action buttons
  const renderActionButtons = (isMobile: boolean = false) => {
    if (
      wager.status !== "PENDING" ||
      (!onMarkWin && !onMarkLoss && !onMarkPush && !onMarkVoid && !onCancel)
    ) {
      return null;
    }

    const containerClasses = isMobile ? "flex gap-1" : "flex gap-2";

    return (
      <div className={containerClasses}>
        {renderWinButton(isMobile)}
        {renderLossButton(isMobile)}
        {renderMoreDropdown(isMobile)}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      {/* Mobile Layout (vertical) */}
      <div className="block md:hidden">
        {/* Header - Game Info and Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-base font-semibold text-gray-900 leading-tight">
              <div>{wager.event.awayTeam}</div>
              <div>@ {wager.event.homeTeam}</div>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(
              wager.status
            )}`}
          >
            {wager.status}
          </span>
        </div>

        {/* Bet Details - Grid Layout */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          <div className="text-center bg-gray-50 p-2 rounded">
            <p className="text-gray-600 text-xs mb-1">
              {getMarketTypeDisplay()}
            </p>
            <p className="font-medium text-sm">{getSelectionText()}</p>
          </div>
          <div className="text-center bg-gray-50 p-2 rounded">
            <p className="text-gray-600 text-xs mb-1">Odds</p>
            <p className="font-medium text-sm">
              {formatOdds(wager.acceptedPrice)}
            </p>
          </div>
          <div className="text-center bg-gray-50 p-2 rounded">
            <p className="text-gray-600 text-xs mb-1">Stake</p>
            <p className="font-medium text-sm">
              {formatCurrency(wager.stakeCents)}
            </p>
          </div>
          <div className="text-center bg-gray-50 p-2 rounded">
            <p className="text-gray-600 text-xs mb-1">Potential</p>
            <p className="font-medium text-sm text-green-600">
              {formatCurrency(wager.potentialPayoutCents)}
            </p>
          </div>
        </div>

        {/* User Info and Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="text-gray-600">{wager.user.displayName}</p>
            <p className="text-gray-500 text-xs">
              {formatDateTime(wager.placedAt)}
            </p>
          </div>

          {/* Action Buttons - Mobile */}
          {renderActionButtons(true)}
        </div>
      </div>

      {/* Desktop Layout (horizontal) */}
      <div className="hidden md:flex items-center justify-between gap-4">
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
          {renderActionButtons(false)}
        </div>
      </div>
    </div>
  );
}
