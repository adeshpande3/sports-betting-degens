import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // upsert a demo user
  const user = await prisma.user.upsert({
    where: { email: "adit@example.com" },
    update: {},
    create: {
      email: "adit@example.com",
      displayName: "Adit",
      balanceCents: 20000, // $200
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "arvind@example.com" },
    update: {},
    create: {
      email: "arvind@example.com",
      displayName: "Arvind",
      balanceCents: 20000, // $200
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "vikas@example.com" },
    update: {},
    create: {
      email: "vikas@example.com",
      displayName: "Vikas",
      balanceCents: 20000, // $200
    },
  });

  // const league = await prisma.league.create({
  //   data: { name: "NBA" },
  // });

  // const event = await prisma.event.create({
  //   data: {
  //     leagueId: league.id,
  //     homeTeam: "LAL",
  //     awayTeam: "BOS",
  //     startsAt: new Date(Date.now() + 60 * 60 * 1000), // +1h
  //     status: "SCHEDULED",
  //   },
  // });

  // const market = await prisma.market.create({
  //   data: {
  //     eventId: event.id,
  //     type: "SPREAD",
  //   },
  // });

  // const lineHome = await prisma.line.create({
  //   data: {
  //     marketId: market.id,
  //     selectionKey: "HOME",
  //     point: "-3.5",
  //     price: -110,
  //     source: "mock",
  //   },
  // });

  // console.log("Seeded:");
  // console.log({
  //   userId: user.id,
  //   leagueId: league.id,
  //   eventId: event.id,
  //   marketId: market.id,
  //   lineId: lineHome.id,
  // });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
