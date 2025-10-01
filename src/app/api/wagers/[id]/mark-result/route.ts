import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Zod validation schema for marking wager results
const markResultSchema = z.object({
  result: z.enum(["WON", "LOST", "PUSH", "VOID"], {
    message: "Result must be WON, LOST, PUSH, or VOID",
  }),
});

// Calculate payout based on American odds
function calculatePayout(stakeCents: number, americanOdds: number): number {
  if (americanOdds > 0) {
    // Positive odds: (stake * odds) / 100 + stake
    return Math.round((stakeCents * americanOdds) / 100 + stakeCents);
  } else {
    // Negative odds: (stake * 100) / |odds| + stake
    return Math.round((stakeCents * 100) / Math.abs(americanOdds) + stakeCents);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: wagerId } = await params;
    const body = await request.json();

    console.log(`Mark result request for wager ${wagerId}:`, body);

    // Validate request data with Zod
    const validationResult = markResultSchema.safeParse(body);

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

    const { result } = validationResult.data;

    // Use a database transaction to ensure data consistency
    const updatedWager = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // First, fetch the current wager to validate it exists and check status
        const existingWager = await tx.wager.findUnique({
          where: { id: wagerId },
          include: {
            user: true,
            line: true,
          },
        });

        if (!existingWager) {
          throw new Error("Wager not found");
        }

        // Check if wager is already settled
        if (existingWager.status !== "PENDING") {
          throw new Error(
            `Wager is already settled with status: ${existingWager.status}`
          );
        }

        // Update the wager status
        const wager = await tx.wager.update({
          where: { id: wagerId },
          data: { status: result },
          include: {
            user: true,
            line: true,
          },
        });

        let ledgerEntry = null;
        let balanceChange = 0;

        // Create appropriate ledger entry based on result
        switch (result) {
          case "WON": {
            // Calculate payout (stake + winnings)
            const payoutCents = calculatePayout(
              wager.stakeCents,
              wager.acceptedPrice
            );
            balanceChange = payoutCents;

            // Create payout ledger entry
            ledgerEntry = await tx.ledgerEntry.create({
              data: {
                userId: wager.userId,
                wagerId: wager.id,
                type: "WAGER_PAYOUT",
                amountCents: payoutCents,
                description: `Payout for winning wager ${wager.id}`,
              },
            });
            break;
          }

          case "PUSH": {
            // Refund the original stake
            balanceChange = wager.stakeCents;

            // Create refund ledger entry
            ledgerEntry = await tx.ledgerEntry.create({
              data: {
                userId: wager.userId,
                wagerId: wager.id,
                type: "WAGER_REFUND",
                amountCents: wager.stakeCents,
                description: `Refund for pushed wager ${wager.id}`,
              },
            });
            break;
          }

          case "VOID": {
            // Refund the original stake (same as push)
            balanceChange = wager.stakeCents;

            // Create refund ledger entry
            ledgerEntry = await tx.ledgerEntry.create({
              data: {
                userId: wager.userId,
                wagerId: wager.id,
                type: "WAGER_REFUND",
                amountCents: wager.stakeCents,
                description: `Refund for voided wager ${wager.id}`,
              },
            });
            break;
          }

          case "LOST":
            // No payout or refund needed - stake was already deducted when wager was placed
            // No ledger entry needed as the WAGER_STAKE entry was created when placing the bet
            break;

          default:
            throw new Error(`Unexpected result type: ${result}`);
        }

        // Update user balance if there's a balance change
        if (balanceChange > 0) {
          await tx.user.update({
            where: { id: wager.userId },
            data: {
              balanceCents: {
                increment: balanceChange,
              },
            },
          });
        }

        return {
          wager,
          ledgerEntry,
          balanceChange,
        };
      }
    );

    console.log(`Wager ${wagerId} marked as ${result}`);

    // Format response
    const response = {
      success: true,
      wager: {
        id: updatedWager.wager.id,
        status: updatedWager.wager.status,
        stakeCents: updatedWager.wager.stakeCents,
        acceptedPrice: updatedWager.wager.acceptedPrice,
        userId: updatedWager.wager.userId,
      },
      balanceChange: updatedWager.balanceChange,
      ledgerEntry: updatedWager.ledgerEntry
        ? {
            id: updatedWager.ledgerEntry.id,
            type: updatedWager.ledgerEntry.type,
            amountCents: updatedWager.ledgerEntry.amountCents,
            description: updatedWager.ledgerEntry.description,
          }
        : null,
      message: `Wager marked as ${result} successfully`,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error marking wager result:", error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage === "Wager not found") {
        return NextResponse.json(
          {
            error: {
              code: "WAGER_NOT_FOUND",
              message: "The specified wager does not exist",
            },
          },
          { status: 404 }
        );
      }

      if (errorMessage.includes("already settled")) {
        return NextResponse.json(
          {
            error: {
              code: "WAGER_ALREADY_SETTLED",
              message: errorMessage,
            },
          },
          { status: 409 }
        );
      }

      // Handle validation or database constraint errors
      return NextResponse.json(
        {
          error: {
            code: "BUSINESS_LOGIC_ERROR",
            message: errorMessage,
          },
        },
        { status: 422 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An unexpected error occurred while marking the wager result",
        },
      },
      { status: 500 }
    );
  }
}
