"use client";

import { useState } from "react";

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  spread: {
    home: number;
    away: number;
    homeOdds: number;
    awayOdds: number;
  };
  moneyline: {
    homeOdds: number;
    awayOdds: number;
  };
  total: {
    points: number;
    overOdds: number;
    underOdds: number;
  };
}

interface GameCardProps {
  game: Game;
  onPlaceWager: (gameId: string, betType: string, amount: number) => void;
}

export default function GameCard({ game, onPlaceWager }: GameCardProps) {
  const [wagerAmount, setWagerAmount] = useState<string>("");
  const [selectedBet, setSelectedBet] = useState<string>("");

  const formatOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const formatTime = (timeString: string): string => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handlePlaceWager = () => {
    const amount = parseFloat(wagerAmount);
    if (selectedBet && amount > 0) {
      onPlaceWager(game.id, selectedBet, amount);
      setWagerAmount("");
      setSelectedBet("");
    }
  };

  const betOptions = [
    {
      key: "home_spread",
      label: `${game.homeTeam} ${game.spread.home > 0 ? "+" : ""}${
        game.spread.home
      }`,
      odds: formatOdds(game.spread.homeOdds),
    },
    {
      key: "away_spread",
      label: `${game.awayTeam} ${game.spread.away > 0 ? "+" : ""}${
        game.spread.away
      }`,
      odds: formatOdds(game.spread.awayOdds),
    },
    {
      key: "home_ml",
      label: `${game.homeTeam} ML`,
      odds: formatOdds(game.moneyline.homeOdds),
    },
    {
      key: "away_ml",
      label: `${game.awayTeam} ML`,
      odds: formatOdds(game.moneyline.awayOdds),
    },
    {
      key: "over",
      label: `Over ${game.total.points}`,
      odds: formatOdds(game.total.overOdds),
    },
    {
      key: "under",
      label: `Under ${game.total.points}`,
      odds: formatOdds(game.total.underOdds),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-4">
      {/* Game Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold">
          <span className="text-gray-600">{game.awayTeam}</span>
          <span className="mx-2 text-gray-400">@</span>
          <span className="text-gray-900">{game.homeTeam}</span>
        </div>
        <div className="text-sm text-gray-500">
          {formatTime(game.startTime)}
        </div>
      </div>

      {/* Betting Options */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {betOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => setSelectedBet(option.key)}
            className={`p-3 rounded-md border text-sm font-medium transition-colors ${
              selectedBet === option.key
                ? "bg-blue-100 border-blue-500 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div>{option.label}</div>
            <div className="text-xs text-gray-500">{option.odds}</div>
          </button>
        ))}
      </div>

      {/* Wager Input */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label
            htmlFor={`wager-${game.id}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Wager Amount ($)
          </label>
          <input
            id={`wager-${game.id}`}
            type="number"
            value={wagerAmount}
            onChange={(e) => setWagerAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handlePlaceWager}
          disabled={
            !selectedBet || !wagerAmount || parseFloat(wagerAmount) <= 0
          }
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Place Bet
        </button>
      </div>

      {/* Selected Bet Display */}
      {selectedBet && (
        <div className="mt-3 p-2 bg-blue-50 rounded-md text-sm text-blue-700">
          Selected: {betOptions.find((opt) => opt.key === selectedBet)?.label}(
          {betOptions.find((opt) => opt.key === selectedBet)?.odds})
        </div>
      )}
    </div>
  );
}
