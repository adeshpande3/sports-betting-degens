import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const wagerId = searchParams.get("wagerId");
    const limit = searchParams.get("limit");

    console.log("GET ledger entries request:", {
      userId,
      type,
      wagerId,
      limit,
    });

    // Build where clause for filtering
    const whereClause: any = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (type) {
      whereClause.type = type.toUpperCase();
    }

    if (wagerId) {
      whereClause.wagerId = wagerId;
    }

    // Parse limit with default and max
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;

    // Fetch ledger entries from database with all related data
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        wager: {
          include: {
            line: {
              include: {
                market: {
                  include: {
                    event: {
                      include: {
                        league: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Most recent first
      },
      take: parsedLimit,
    });

    console.log(`Found ${ledgerEntries.length} ledger entries`);

    // Format response data
    const formattedEntries = ledgerEntries.map((entry: any) => ({
      id: entry.id,
      userId: entry.userId,
      wagerId: entry.wagerId,
      type: entry.type,
      amountCents: entry.amountCents,
      description: entry.description,
      createdAt: entry.createdAt.toISOString(),
      user: {
        id: entry.user.id,
        displayName: entry.user.displayName,
        email: entry.user.email,
      },
      wager: entry.wager
        ? {
            id: entry.wager.id,
            stakeCents: entry.wager.stakeCents,
            acceptedPoint: entry.wager.acceptedPoint?.toString(),
            acceptedPrice: entry.wager.acceptedPrice,
            placedAt: entry.wager.placedAt.toISOString(),
            status: entry.wager.status,
            line: entry.wager.line
              ? {
                  id: entry.wager.line.id,
                  selectionKey: entry.wager.line.selectionKey,
                  point: entry.wager.line.point?.toString(),
                  price: entry.wager.line.price,
                  source: entry.wager.line.source,
                  capturedAt: entry.wager.line.capturedAt.toISOString(),
                  market: {
                    id: entry.wager.line.market.id,
                    type: entry.wager.line.market.type,
                    event: {
                      id: entry.wager.line.market.event.id,
                      homeTeam: entry.wager.line.market.event.homeTeam,
                      awayTeam: entry.wager.line.market.event.awayTeam,
                      startsAt:
                        entry.wager.line.market.event.startsAt.toISOString(),
                      status: entry.wager.line.market.event.status,
                      league: {
                        id: entry.wager.line.market.event.league.id,
                        name: entry.wager.line.market.event.league.name,
                      },
                    },
                  },
                }
              : null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      entries: formattedEntries,
      count: formattedEntries.length,
      total: formattedEntries.length, // Could implement total count separately if needed for pagination
    });
  } catch (error) {
    console.error("Error fetching ledger entries:", error);
    return NextResponse.json(
      {
        error: {
          code: "FETCH_LEDGER_ENTRIES_ERROR",
          message: "Failed to fetch ledger entries",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
