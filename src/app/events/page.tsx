"use client";

import { useState, useEffect } from "react";
import GameCard, { Game } from "@/components/GameCard";
import UserStats from "@/components/UserStats";

// Types for API response
interface EventLine {
  id: string;
  selectionKey: "HOME" | "AWAY" | "OVER" | "UNDER";
  point: string | null;
  price: number;
  source: string;
  capturedAt: string;
}

interface EventMarket {
  id: string;
  type: "MONEYLINE" | "SPREAD" | "TOTAL";
  lines: EventLine[];
}

interface ApiEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  status: "SCHEDULED" | "LIVE" | "FINAL";
  league: {
    id: string;
    name: string;
  };
  markets: EventMarket[];
  marketCount: number;
}

interface EventsApiResponse {
  success: boolean;
  events: ApiEvent[];
  count: number;
}

export default function Events() {
  const [games, setGames] = useState<Game[]>([]);
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]); // Store original API data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placingWager, setPlacingWager] = useState<string | null>(null); // Track which bet is being placed

  // Transform API event data to Game format for existing GameCard component
  const transformEventToGame = (event: ApiEvent): Game | null => {
    try {
      // Find markets by type
      const spreadMarket = event.markets.find((m) => m.type === "SPREAD");
      const moneylineMarket = event.markets.find((m) => m.type === "MONEYLINE");
      const totalMarket = event.markets.find((m) => m.type === "TOTAL");

      // Helper function to find lines by selection
      const findLine = (market: EventMarket | undefined, selection: string) =>
        market?.lines.find((line) => line.selectionKey === selection);

      // Extract spread data
      const homeSpreadLine = findLine(spreadMarket, "HOME");
      const awaySpreadLine = findLine(spreadMarket, "AWAY");

      // Extract moneyline data
      const homeMoneylineLine = findLine(moneylineMarket, "HOME");
      const awayMoneylineLine = findLine(moneylineMarket, "AWAY");

      // Extract total data
      const overLine = findLine(totalMarket, "OVER");
      const underLine = findLine(totalMarket, "UNDER");

      return {
        id: event.id,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        startTime: event.startsAt,
        spread: {
          home: homeSpreadLine?.point ? parseFloat(homeSpreadLine.point) : 0,
          away: awaySpreadLine?.point ? parseFloat(awaySpreadLine.point) : 0,
          homeOdds: homeSpreadLine?.price || -110,
          awayOdds: awaySpreadLine?.price || -110,
        },
        moneyline: {
          homeOdds: homeMoneylineLine?.price || -110,
          awayOdds: awayMoneylineLine?.price || -110,
        },
        total: {
          points: overLine?.point ? parseFloat(overLine.point) : 0,
          overOdds: overLine?.price || -110,
          underOdds: underLine?.price || -110,
        },
      };
    } catch (err) {
      console.error("Error transforming event:", event.id, err);
      return null;
    }
  };

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/events?status=SCHEDULED");

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data: EventsApiResponse = await response.json();

      console.log("Fetched events:", data);

      if (data.success) {
        // Store original API data for line ID lookup
        setApiEvents(data.events);

        // Transform API events to Game format and filter out any failed transformations
        const transformedGames = data.events
          .map(transformEventToGame)
          .filter((game): game is Game => game !== null);

        setGames(transformedGames);
      } else {
        throw new Error("API returned unsuccessful response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, []);

  const handlePlaceWager = async (
    gameId: string,
    betType: string,
    amount: number
  ) => {
    try {
      setPlacingWager(`${gameId}-${betType}`);

      // Find the corresponding API event
      const apiEvent = apiEvents.find((event) => event.id === gameId);
      if (!apiEvent) {
        throw new Error("Event not found");
      }

      // Map bet type to line ID
      const getLineIdForBet = (
        event: ApiEvent,
        betType: string
      ): string | null => {
        switch (betType) {
          case "home_spread":
            return (
              event.markets
                .find((m) => m.type === "SPREAD")
                ?.lines.find((l) => l.selectionKey === "HOME")?.id || null
            );

          case "away_spread":
            return (
              event.markets
                .find((m) => m.type === "SPREAD")
                ?.lines.find((l) => l.selectionKey === "AWAY")?.id || null
            );

          case "home_ml":
            return (
              event.markets
                .find((m) => m.type === "MONEYLINE")
                ?.lines.find((l) => l.selectionKey === "HOME")?.id || null
            );

          case "away_ml":
            return (
              event.markets
                .find((m) => m.type === "MONEYLINE")
                ?.lines.find((l) => l.selectionKey === "AWAY")?.id || null
            );

          case "over":
            return (
              event.markets
                .find((m) => m.type === "TOTAL")
                ?.lines.find((l) => l.selectionKey === "OVER")?.id || null
            );

          case "under":
            return (
              event.markets
                .find((m) => m.type === "TOTAL")
                ?.lines.find((l) => l.selectionKey === "UNDER")?.id || null
            );

          default:
            return null;
        }
      };

      console.log("apiEvent:", apiEvent);
      const lineId = getLineIdForBet(apiEvent, betType);
      if (!lineId) {
        throw new Error(`Unable to find betting line for ${betType}`);
      }

      // Convert amount to cents
      const stakeCents = Math.round(amount * 100);

      // Make API call to place wager
      const response = await fetch("/api/wagers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "eb96797e-47f3-4d73-b38f-31c2a065b415", // TODO: Get from actual user context
        },
        body: JSON.stringify({
          lineId,
          stakeCents,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to place wager");
      }

      if (result.success) {
        // Show success message
        alert(
          `✅ Wager placed successfully!\nBet: ${betType}\nAmount: $${amount}\nWager ID: ${result.wager.id.slice(
            -8
          )}`
        );

        // Optionally refresh events to show updated odds/lines
        // await fetchEvents();
      } else {
        throw new Error("Wager placement failed");
      }
    } catch (error) {
      console.error("Error placing wager:", error);
      alert(
        `❌ Failed to place wager: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setPlacingWager(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Events</h1>

      <div className="flex gap-6 max-w-7xl mx-auto">
        {/* Games Column - 75% width */}
        <div className="flex-1">
          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
              <div className="text-red-800 font-medium mb-2">
                Error Loading Events
              </div>
              <div className="text-red-600 text-sm mb-4">{error}</div>
              <button
                onClick={fetchEvents}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && games.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">
                No scheduled events found
              </div>
              <div className="text-gray-400 text-sm">
                Check back later for upcoming games.
              </div>
            </div>
          )}

          {/* Games List */}
          {!loading && !error && games.length > 0 && (
            <>
              <div className="text-center text-gray-600 mb-6">
                Showing {games.length} scheduled event
                {games.length !== 1 ? "s" : ""}
              </div>
              {games.map((game) => {
                const gameKey = game.id;
                const isPlacingAnyWager = placingWager?.startsWith(gameKey);

                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    onPlaceWager={handlePlaceWager}
                    isPlacingWager={isPlacingAnyWager}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* User Stats Column - 25% width */}
        <div className="w-1/4 min-w-[300px]">
          <UserStats userId="user-1" />
        </div>
      </div>
    </div>
  );
}
