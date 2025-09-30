"use client";

import { useState, useEffect } from "react";
import GameCard, { Game } from "@/components/GameCard";
import UserStats from "@/components/UserStats";
import { User, UsersApiResponse } from "@/types/user";

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placingWager, setPlacingWager] = useState<string | null>(null); // Track which bet is being placed
  const [syncing, setSyncing] = useState(false); // Track odds sync status

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
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both events and users in parallel
      const [eventsResponse, usersData] = await Promise.all([
        fetch("/api/events?status=SCHEDULED"),
        fetchUsers(),
      ]);

      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
      }

      const eventsData: EventsApiResponse = await eventsResponse.json();

      console.log("Fetched events:", eventsData);
      console.log("Fetched users:", usersData);

      if (eventsData.success) {
        // Store original API data for line ID lookup
        setApiEvents(eventsData.events);

        // Transform API events to Game format and filter out any failed transformations
        const transformedGames = eventsData.events
          .map(transformEventToGame)
          .filter((game): game is Game => game !== null);

        setGames(transformedGames);
      } else {
        throw new Error("API returned unsuccessful response");
      }

      // Set users data
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setGames([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users from API
  const fetchUsers = async (): Promise<User[]> => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      const data: UsersApiResponse = await response.json();
      return data.users;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  };

  // Legacy function for backwards compatibility (some code still calls fetchEvents)
  const fetchEvents = async () => {
    try {
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
    }
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  const handlePlaceWager = async (
    gameId: string,
    betType: string,
    amount: number,
    userId: string
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
          "x-user-id": userId, // Use the selected user ID
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

  const handleSyncOdds = async () => {
    try {
      setSyncing(true);

      const response = await fetch("/api/odds/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sport: "americanfootball_nfl",
          markets: "h2h,spreads,totals",
          regions: "us",
          oddsFormat: "american",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to sync odds");
      }

      console.log("Sync result:", result);

      if (result.success) {
        alert(
          `✅ Sync completed!\n` +
            `Events Created: ${result?.data?.eventsCreated}\n` +
            `Lines Created: ${result?.data?.linesCreated}\n` +
            `Total Games Processed: ${result?.data?.totalGamesProcessed}\n` +
            `API Used: ${result?.data?.apiUsedRequests}\n` +
            `API Remaining: ${result?.data?.apiRemainingRequests}`
        );

        // Refresh the events list to show new data
        await fetchEvents();
      } else {
        throw new Error("Sync failed");
      }
    } catch (error) {
      console.error("Error syncing odds:", error);
      alert(
        `❌ Failed to sync odds: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSyncing(false);
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
              {games.map((game) => {
                const gameKey = game.id;
                const isPlacingAnyWager = placingWager?.startsWith(gameKey);

                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    users={users}
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
          {/* Sync Odds Button */}
          <div className="mb-6">
            <button
              onClick={handleSyncOdds}
              disabled={syncing}
              className={`w-full px-4 py-3 font-semibold rounded-lg transition-colors ${
                syncing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {syncing ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Syncing...
                </span>
              ) : (
                "Pull latest odds/games"
              )}
            </button>
          </div>

          <UserStats userId="user-1" />
        </div>
      </div>
    </div>
  );
}
