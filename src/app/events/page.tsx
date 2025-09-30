"use client";

import GameCard, { Game } from "@/components/GameCard";
import UserStats from "@/components/UserStats";

// Mock data for demonstration
const mockGames: Game[] = [
  {
    id: "1",
    homeTeam: "Lakers",
    awayTeam: "Warriors",
    startTime: "2024-12-15T20:00:00Z",
    spread: {
      home: -3.5,
      away: 3.5,
      homeOdds: -110,
      awayOdds: -110,
    },
    moneyline: {
      homeOdds: -150,
      awayOdds: 130,
    },
    total: {
      points: 225.5,
      overOdds: -110,
      underOdds: -110,
    },
  },
  {
    id: "2",
    homeTeam: "Celtics",
    awayTeam: "Heat",
    startTime: "2024-12-15T22:30:00Z",
    spread: {
      home: -7,
      away: 7,
      homeOdds: -105,
      awayOdds: -115,
    },
    moneyline: {
      homeOdds: -280,
      awayOdds: 220,
    },
    total: {
      points: 210,
      overOdds: -115,
      underOdds: -105,
    },
  },
  {
    id: "3",
    homeTeam: "Nuggets",
    awayTeam: "Suns",
    startTime: "2024-12-16T19:00:00Z",
    spread: {
      home: -2,
      away: 2,
      homeOdds: -110,
      awayOdds: -110,
    },
    moneyline: {
      homeOdds: -120,
      awayOdds: 100,
    },
    total: {
      points: 230,
      overOdds: -110,
      underOdds: -110,
    },
  },
];

export default function Events() {
  const handlePlaceWager = (
    gameId: string,
    betType: string,
    amount: number
  ) => {
    console.log(
      `Placing wager: Game ${gameId}, Bet: ${betType}, Amount: $${amount}`
    );
    // TODO: Implement actual wager placement logic
    alert(`Wager placed! Game: ${gameId}, Bet: ${betType}, Amount: $${amount}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Events</h1>

      <div className="flex gap-6 max-w-7xl mx-auto">
        {/* Games Column - 75% width */}
        <div className="flex-1">
          {mockGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onPlaceWager={handlePlaceWager}
            />
          ))}
        </div>

        {/* User Stats Column - 25% width */}
        <div className="w-1/4 min-w-[300px]">
          <UserStats userId="user-1" />
        </div>
      </div>
    </div>
  );
}
