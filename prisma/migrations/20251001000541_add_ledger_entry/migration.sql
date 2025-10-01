-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('WAGER_STAKE', 'WAGER_PAYOUT', 'WAGER_REFUND', 'DEPOSIT', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wagerId" TEXT,
    "type" "LedgerType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_wagerId_fkey" FOREIGN KEY ("wagerId") REFERENCES "Wager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
