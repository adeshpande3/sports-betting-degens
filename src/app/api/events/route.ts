import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const leagueId = searchParams.get("leagueId");

    console.log("GET events request:", { status, leagueId });

    // Build where clause for filtering
    const whereClause: any = {};

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    if (leagueId) {
      whereClause.leagueId = leagueId;
    }

    // Fetch events from database with all related data
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        league: true,
        markets: {
          include: {
            lines: {
              orderBy: {
                capturedAt: "desc",
              },
              take: 1, // Get the most recent line for each market
            },
          },
        },
        _count: {
          select: {
            markets: true,
          },
        },
      },
      orderBy: {
        startsAt: "asc", // Upcoming events first
      },
    });

    // Format response data
    const formattedEvents = events.map((event: any) => ({
      id: event.id,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      startsAt: event.startsAt.toISOString(),
      status: event.status,
      league: {
        id: event.league.id,
        name: event.league.name,
      },
      markets: event.markets.map((market: any) => ({
        id: market.id,
        type: market.type,
        lines: market.lines.map((line: any) => ({
          id: line.id,
          selectionKey: line.selectionKey,
          point: line.point?.toString(),
          price: line.price,
          source: line.source,
          capturedAt: line.capturedAt.toISOString(),
        })),
      })),
      marketCount: event._count.markets,
    }));

    return NextResponse.json({
      success: true,
      events: formattedEvents,
      count: formattedEvents.length,
    });
  } catch (error) {
    console.error("Error fetching events:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch events",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
