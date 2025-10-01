import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// Environment variable validation
const ODDS_API_KEY = process.env.ODDS_API_KEY;

if (!ODDS_API_KEY) {
  console.warn("ODDS_API_KEY not found in environment variables");
}

// Zod schemas for validation
const syncRequestSchema = z.object({
  sport: z.string().optional().default("americanfootball_nfl"),
  markets: z.string().optional().default("h2h,spreads,totals"),
  regions: z.string().optional().default("us"),
  oddsFormat: z.string().optional().default("american"),
});

// Odds API response type definitions
interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Array<{
    key: string;
    last_update: string;
    outcomes: Array<{
      name: string;
      price: number;
      point?: number;
    }>;
  }>;
}

interface OddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

// Helper function to map market types
function mapMarketType(
  oddsApiMarketKey: string
): "MONEYLINE" | "SPREAD" | "TOTAL" | null {
  switch (oddsApiMarketKey) {
    case "h2h":
      return "MONEYLINE";
    case "spreads":
      return "SPREAD";
    case "totals":
      return "TOTAL";
    default:
      return null;
  }
}

// Helper function to map selection keys
function mapSelectionKey(
  marketType: "MONEYLINE" | "SPREAD" | "TOTAL",
  outcomeName: string,
  homeTeam: string,
  awayTeam: string
): "HOME" | "AWAY" | "OVER" | "UNDER" | null {
  if (marketType === "TOTAL") {
    return outcomeName.toLowerCase().includes("over") ? "OVER" : "UNDER";
  }

  if (marketType === "MONEYLINE" || marketType === "SPREAD") {
    if (outcomeName === homeTeam) return "HOME";
    if (outcomeName === awayTeam) return "AWAY";
  }

  return null;
}

// Helper function to find or create league
async function findOrCreateLeague(sportTitle: string, tx: any) {
  let league = await tx.league.findFirst({
    where: { name: sportTitle },
  });

  if (!league) {
    league = await tx.league.create({
      data: { name: sportTitle },
    });
  }

  return league;
}

export async function POST(request: NextRequest) {
  try {
    if (!ODDS_API_KEY) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIGURATION_ERROR",
            message: "Odds API key not configured",
          },
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validationResult = syncRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Validation failed",
            details: validationResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { sport, markets, regions, oddsFormat } = validationResult.data;

    // Construct Odds API URL
    const oddsApiUrl = new URL(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds`
    );
    oddsApiUrl.searchParams.set("apiKey", ODDS_API_KEY);
    oddsApiUrl.searchParams.set("regions", regions);
    oddsApiUrl.searchParams.set("markets", markets);
    oddsApiUrl.searchParams.set("oddsFormat", oddsFormat);
    oddsApiUrl.searchParams.set("dateFormat", "iso");

    console.log("Fetching odds from:", oddsApiUrl.toString());

    // Fetch data from Odds API
    const oddsResponse = await fetch(oddsApiUrl.toString());

    if (!oddsResponse.ok) {
      throw new Error(`Odds API responded with status: ${oddsResponse.status}`);
    }

    const oddsData: OddsApiGame[] = await oddsResponse.json();
    console.log(`Received ${oddsData.length} games from Odds API`);

    // Process and store the data in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const processedEvents = [];
      const processedLines = [];

      for (const game of oddsData) {
        try {
          // Find or create league
          const league = await findOrCreateLeague(game.sport_title, tx);

          // Check if event already exists
          let event = await tx.event.findFirst({
            where: {
              homeTeam: game.home_team,
              awayTeam: game.away_team,
              startsAt: new Date(game.commence_time),
              leagueId: league.id,
            },
          });

          // Create event if it doesn't exist
          if (!event) {
            event = await tx.event.create({
              data: {
                leagueId: league.id,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                startsAt: new Date(game.commence_time),
                status: "SCHEDULED",
              },
            });
            processedEvents.push(event);
          }

          // Find the bookmaker with the most markets (most lines)
          const bookmaker = game.bookmakers.reduce((max, curr) => {
            const currLines = curr.markets.reduce(
              (sum, market) => sum + (market.outcomes?.length ?? 0),
              0
            );
            const maxLines = max.markets.reduce(
              (sum, market) => sum + (market.outcomes?.length ?? 0),
              0
            );
            return currLines > maxLines ? curr : max;
          }, game.bookmakers[0]);

          for (const market of bookmaker.markets) {
            const marketType = mapMarketType(market.key);
            if (!marketType) continue;

            // Find or create market
            let dbMarket = await tx.market.findFirst({
              where: {
                eventId: event.id,
                type: marketType,
              },
            });

            if (!dbMarket) {
              dbMarket = await tx.market.create({
                data: {
                  eventId: event.id,
                  type: marketType,
                },
              });
            }

            // Process outcomes and create lines
            for (const outcome of market.outcomes) {
              const selectionKey = mapSelectionKey(
                marketType,
                outcome.name,
                game.home_team,
                game.away_team
              );

              if (!selectionKey) continue;

              // Create line
              const line = await tx.line.create({
                data: {
                  marketId: dbMarket.id,
                  selectionKey,
                  point: outcome.point ? new Decimal(outcome.point) : null,
                  price: Math.round(outcome.price), // Convert to integer for American odds
                  source: `${bookmaker.key}:${bookmaker.title}`,
                  capturedAt: new Date(market.last_update),
                },
              });
              processedLines.push(line);
            }
          }
        } catch (gameError) {
          console.error(`Error processing game ${game.id}:`, gameError);
          // Continue processing other games
        }
      }

      return {
        eventsCreated: processedEvents.length,
        linesCreated: processedLines.length,
        totalGamesProcessed: oddsData.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Odds data synchronized successfully",
      data: {
        ...result,
        apiRemainingRequests: oddsResponse.headers.get("x-requests-remaining"),
        apiUsedRequests: oddsResponse.headers.get("x-requests-used"),
      },
    });
  } catch (error) {
    console.error("Error synchronizing odds data:", error);

    return NextResponse.json(
      {
        error: {
          code: "SYNC_ERROR",
          message: "Failed to synchronize odds data",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status or recent syncs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "true";

    if (includeStats) {
      // Get stats about recent data
      const stats = await prisma.$transaction(async (tx) => {
        const totalEvents = await tx.event.count();
        const totalLines = await tx.line.count();
        const recentEvents = await tx.event.count({
          where: {
            startsAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Next 7 days
            },
          },
        });
        const recentLines = await tx.line.count({
          where: {
            capturedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        });

        return {
          totalEvents,
          totalLines,
          recentEvents,
          recentLines,
        };
      });

      return NextResponse.json({
        success: true,
        stats,
        apiKeyConfigured: !!ODDS_API_KEY,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Odds sync endpoint is ready",
      apiKeyConfigured: !!ODDS_API_KEY,
    });
  } catch (error) {
    console.error("Error checking sync status:", error);

    return NextResponse.json(
      {
        error: {
          code: "STATUS_ERROR",
          message: "Failed to check sync status",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
