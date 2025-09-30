/**
 * Example usage of the Odds API integration
 * This file demonstrates how to use the new odds sync functionality
 */

import {
  OddsApiClient,
  POPULAR_SPORTS,
  buildMarketsString,
} from "@/lib/odds-api";

// Example 1: Basic odds sync
async function syncUpcomingGames() {
  const client = new OddsApiClient();

  console.log("🏈 Syncing upcoming games...");

  const result = await client.syncOdds({
    sport: "upcoming", // Gets games from all sports
    markets: buildMarketsString(["MONEYLINE", "SPREAD", "TOTAL"]),
    regions: "us",
    oddsFormat: "american",
  });

  if ("success" in result && result.success) {
    console.log("✅ Sync successful!");
    console.log(`Created ${result.data.eventsCreated} events`);
    console.log(`Created ${result.data.linesCreated} lines`);
  } else if ("error" in result) {
    console.error("❌ Sync failed:", result.error);
  }
}

// Example 2: Sync specific sport (NFL)
async function syncNFL() {
  const client = new OddsApiClient();

  console.log("🏈 Syncing NFL games...");

  const result = await client.syncOdds({
    sport: POPULAR_SPORTS.NFL,
    markets: buildMarketsString(["MONEYLINE", "SPREAD", "TOTAL"]),
    regions: "us",
    oddsFormat: "american",
  });

  if ("success" in result && result.success) {
    console.log("✅ NFL sync successful!");
    console.log(`API requests remaining: ${result.data.apiRemainingRequests}`);
  }
}

// Example 3: Check sync status and stats
async function checkSyncStatus() {
  const client = new OddsApiClient();

  // Check if API is configured
  const status = await client.checkStatus();
  console.log("🔧 API Status:", status);

  // Get detailed stats
  const stats = await client.getStats();
  if ("success" in stats && stats.success) {
    console.log("📊 Database Stats:");
    console.log(`  Total Events: ${stats.stats.totalEvents}`);
    console.log(`  Total Lines: ${stats.stats.totalLines}`);
    console.log(`  Recent Events: ${stats.stats.recentEvents}`);
    console.log(`  Recent Lines: ${stats.stats.recentLines}`);
  }
}

// Example 4: Fetch and display events with odds
async function displayEventsWithOdds() {
  try {
    // First sync some data
    await syncUpcomingGames();

    // Then fetch the events via our existing events API
    const eventsResponse = await fetch("/api/events?status=SCHEDULED");
    const eventsData = await eventsResponse.json();

    if (eventsData.success) {
      console.log("\n🎯 Events with odds:");
      eventsData.events.slice(0, 5).forEach((event: any) => {
        console.log(`\n${event.homeTeam} vs ${event.awayTeam}`);
        console.log(`League: ${event.league.name}`);
        console.log(`Start: ${new Date(event.startsAt).toLocaleString()}`);

        event.markets.forEach((market: any) => {
          console.log(`  ${market.type}:`);
          market.lines.forEach((line: any) => {
            const odds =
              line.price > 0 ? `+${line.price}` : line.price.toString();
            const point = line.point ? ` (${line.point})` : "";
            console.log(
              `    ${line.selectionKey}: ${odds}${point} [${line.source}]`
            );
          });
        });
      });
    }
  } catch (error) {
    console.error("Error displaying events:", error);
  }
}

// Export examples for use in other files
export { syncUpcomingGames, syncNFL, checkSyncStatus, displayEventsWithOdds };

// If running this file directly
if (require.main === module) {
  (async () => {
    await checkSyncStatus();
    await syncUpcomingGames();
    await displayEventsWithOdds();
  })();
}
