-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINAL');

-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('MONEYLINE', 'SPREAD', 'TOTAL');

-- CreateEnum
CREATE TYPE "Selection" AS ENUM ('HOME', 'AWAY', 'OVER', 'UNDER');

-- CreateEnum
CREATE TYPE "WagerStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'PUSH', 'VOID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "MarketType" NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Line" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "selectionKey" "Selection" NOT NULL,
    "point" DECIMAL(65,30),
    "price" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wager" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "stakeCents" INTEGER NOT NULL,
    "acceptedPoint" DECIMAL(65,30),
    "acceptedPrice" INTEGER NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "WagerStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Wager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Line" ADD CONSTRAINT "Line_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wager" ADD CONSTRAINT "Wager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wager" ADD CONSTRAINT "Wager_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
