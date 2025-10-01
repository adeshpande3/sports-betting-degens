import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { z } from "zod";

// Zod validation schema for creating a new user
const createUserSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be less than 100 characters"),
  balanceCents: z
    .number()
    .int()
    .min(0, "Balance cannot be negative")
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Fetch all users from database with all wagers and ledger entries
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        balanceCents: true,
        createdAt: true,
        _count: {
          select: {
            wagers: true,
          },
        },
        wagers: {
          select: {
            id: true,
            stakeCents: true,
            acceptedPoint: true,
            acceptedPrice: true,
            placedAt: true,
            status: true,
            line: {
              select: {
                id: true,
                selectionKey: true,
                point: true,
                price: true,
                market: {
                  select: {
                    id: true,
                    type: true,
                    event: {
                      select: {
                        id: true,
                        homeTeam: true,
                        awayTeam: true,
                        startsAt: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
            ledgerEntries: {
              select: {
                id: true,
                type: true,
                amountCents: true,
                description: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            placedAt: "desc",
          },
        },
        ledgerEntries: {
          select: {
            id: true,
            type: true,
            amountCents: true,
            description: true,
            createdAt: true,
            wagerId: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Found ${users.length} users`);

    return NextResponse.json({
      users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: {
          code: "FETCH_USERS_ERROR",
          message: "Failed to fetch users",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log("POST users request:", body);

    // Validate request data with Zod
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error);
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid user data",
            details: validationResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { displayName, balanceCents } = validationResult.data;

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        email: crypto.randomUUID(), // Don't really care, just gotta be unique
        displayName,
        balanceCents: balanceCents ?? 10000, // Default to $100.00 if not provided
      },
      select: {
        id: true,
        displayName: true,
        balanceCents: true,
        createdAt: true,
        _count: {
          select: {
            wagers: true,
          },
        },
      },
    });

    console.log(`Created new user with ID: ${newUser.id}`);

    return NextResponse.json(
      {
        user: newUser,
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle Prisma unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        {
          error: {
            code: "USER_EXISTS",
            message: "A user with this email already exists",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "CREATE_USER_ERROR",
          message: "Failed to create user",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
