import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// Zod validation schema
const createWagerSchema = z.object({
  lineId: z.string(),
  stakeCents: z.number().int().min(1, "Stake must be at least 1 cent"),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Log the request body for debugging
    console.log("Wager POST request received:", body);

    // Get userId from header (for local dev) or request body
    const headerUserId = request.headers.get("x-user-id");
    const requestData = {
      ...body,
      userId: headerUserId || body.userId,
    };

    // Validate request data with Zod
    const validationResult = createWagerSchema.safeParse(requestData);

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

    const { lineId, stakeCents, userId } = validationResult.data;

    // Use a database transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify the line exists and get its current price/point
      const line = await tx.line.findUnique({
        where: { id: lineId },
        include: {
          market: {
            include: {
              event: true,
            },
          },
        },
      });

      if (!line) {
        throw new Error("Line not found");
      }

      // Check if event is still open for betting
      if (line.market.event.status !== "SCHEDULED") {
        throw new Error("Event is no longer open for betting");
      }

      // Check if event starts too soon (e.g., within 5 minutes)
      const eventStart = new Date(line.market.event.startsAt);
      const now = new Date();
      const minutesUntilStart =
        (eventStart.getTime() - now.getTime()) / (1000 * 60);

      if (minutesUntilStart < 5) {
        throw new Error("Event starts too soon to place bets");
      }

      // Verify user exists and has sufficient balance (if userId provided)
      if (userId) {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (user.balanceCents < stakeCents) {
          throw new Error("Insufficient balance");
        }
      }

      // Create the wager
      const wager = await tx.wager.create({
        data: {
          userId: userId || "00000000-0000-0000-0000-000000000000", // Default user for local dev
          lineId,
          stakeCents,
          acceptedPoint: line.point,
          acceptedPrice: line.price,
        },
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
          user: true,
        },
      });

      // Create ledger entry for the wager stake (debit)
      const effectiveUserId = userId || "00000000-0000-0000-0000-000000000000";
      await tx.ledgerEntry.create({
        data: {
          userId: effectiveUserId,
          wagerId: wager.id,
          type: "WAGER_STAKE",
          amountCents: -stakeCents, // Negative amount for debit (money leaving user's account)
          description: `Wager stake for ${line.market.event.homeTeam} vs ${line.market.event.awayTeam} - ${line.market.type} ${line.selectionKey}`,
        },
      });

      // Update user balance (subtract the stake)
      if (userId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            balanceCents: {
              decrement: stakeCents,
            },
          },
        });
      }

      return wager;
    });

    console.log("Wager created:", result.id);

    // Calculate potential payout based on American odds
    const calculatePayout = (
      stakeCents: number,
      americanOdds: number
    ): number => {
      if (americanOdds > 0) {
        // Positive odds: (stake * odds) / 100 + stake
        return Math.round((stakeCents * americanOdds) / 100 + stakeCents);
      } else {
        // Negative odds: (stake * 100) / |odds| + stake
        return Math.round(
          (stakeCents * 100) / Math.abs(americanOdds) + stakeCents
        );
      }
    };

    const potentialPayoutCents = calculatePayout(
      stakeCents,
      result.acceptedPrice
    );

    // Format response
    const responseWager = {
      id: result.id,
      userId: result.userId,
      lineId: result.lineId,
      stakeCents: result.stakeCents,
      acceptedPrice: result.acceptedPrice,
      acceptedPoint: result.acceptedPoint?.toString(),
      status: result.status,
      placedAt: result.placedAt.toISOString(),
      potentialPayoutCents,
      event: {
        id: result.line.market.event.id,
        homeTeam: result.line.market.event.homeTeam,
        awayTeam: result.line.market.event.awayTeam,
        startsAt: result.line.market.event.startsAt.toISOString(),
        league: result.line.market.event.league.name,
      },
      market: {
        type: result.line.market.type,
      },
      selection: result.line.selectionKey,
    };

    return NextResponse.json(
      {
        success: true,
        wager: responseWager,
        message: "Wager placed successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing wager:", error);

    // Handle specific database/business logic errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage === "Line not found") {
        return NextResponse.json(
          {
            error: {
              code: "LINE_NOT_FOUND",
              message: "The specified betting line does not exist",
            },
          },
          { status: 404 }
        );
      }

      if (errorMessage === "User not found") {
        return NextResponse.json(
          {
            error: {
              code: "USER_NOT_FOUND",
              message: "User does not exist",
            },
          },
          { status: 404 }
        );
      }

      if (errorMessage === "Insufficient balance") {
        return NextResponse.json(
          {
            error: {
              code: "INSUFFICIENT_BALANCE",
              message: "User does not have enough balance for this wager",
            },
          },
          { status: 400 }
        );
      }

      if (
        errorMessage === "Event is no longer open for betting" ||
        errorMessage === "Event starts too soon to place bets"
      ) {
        return NextResponse.json(
          {
            error: {
              code: "BETTING_CLOSED",
              message: errorMessage,
            },
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process wager",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

// GET method to retrieve wagers from database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    console.log("GET wagers request:", { status });

    // Build where clause for filtering
    const whereClause: any = {};
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    // Fetch wagers from database with all related data
    const wagers = await prisma.wager.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
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
      orderBy: {
        placedAt: "desc", // Most recent first
      },
    });

    // Calculate potential payout for each wager
    const calculatePayout = (
      stakeCents: number,
      americanOdds: number
    ): number => {
      if (americanOdds > 0) {
        // Positive odds: (stake * odds) / 100 + stake
        return Math.round((stakeCents * americanOdds) / 100 + stakeCents);
      } else {
        // Negative odds: (stake * 100) / |odds| + stake
        return Math.round(
          (stakeCents * 100) / Math.abs(americanOdds) + stakeCents
        );
      }
    };

    // Format response data
    const formattedWagers = wagers.map((wager) => ({
      id: wager.id,
      userId: wager.userId,
      user: {
        displayName: wager.user.displayName,
        email: wager.user.email,
      },
      stakeCents: wager.stakeCents,
      acceptedPrice: wager.acceptedPrice,
      acceptedPoint: wager.acceptedPoint?.toString(),
      status: wager.status,
      placedAt: wager.placedAt.toISOString(),
      potentialPayoutCents: calculatePayout(
        wager.stakeCents,
        wager.acceptedPrice
      ),
      event: {
        id: wager.line.market.event.id,
        homeTeam: wager.line.market.event.homeTeam,
        awayTeam: wager.line.market.event.awayTeam,
        startsAt: wager.line.market.event.startsAt.toISOString(),
        status: wager.line.market.event.status,
        league: wager.line.market.event.league.name,
      },
      market: {
        type: wager.line.market.type,
      },
      selection: wager.line.selectionKey,
      line: {
        id: wager.line.id,
        point: wager.line.point?.toString(),
        price: wager.line.price,
        source: wager.line.source,
        capturedAt: wager.line.capturedAt.toISOString(),
      },
    }));

    return NextResponse.json({
      success: true,
      wagers: formattedWagers,
      count: formattedWagers.length,
    });
  } catch (error) {
    console.error("Error fetching wagers:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch wagers",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
