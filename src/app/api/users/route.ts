import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("GET users request");

    // Fetch all users from database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        balanceCents: true,
        createdAt: true,
        _count: {
          select: {
            wagers: true,
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
