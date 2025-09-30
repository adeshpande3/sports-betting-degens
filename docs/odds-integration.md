# Odds API Integration

This module integrates with [The Odds API](https://the-odds-api.com/) to fetch real-time sports betting odds and store them in our local database.

## Setup

1. **Get an API key** from [The Odds API](https://the-odds-api.com/)
2. **Add to environment**: Copy `.env.example` to `.env` and set your `ODDS_API_KEY`
3. **Start database**: `docker-compose up -d postgres` (if using Docker)
4. **Run migrations**: `pnpm db:migrate`

## API Endpoints

### POST `/api/odds/sync`

Fetches odds data from The Odds API and stores events/lines in the database.

**Request Body:**

```json
{
  "sport": "americanfootball_nfl",
  "markets": "h2h,spreads,totals",
  "regions": "us",
  "oddsFormat": "american"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Odds data synchronized successfully",
  "data": {
    "eventsCreated": 15,
    "linesCreated": 180,
    "totalGamesProcessed": 15,
    "apiRemainingRequests": "485",
    "apiUsedRequests": "15"
  }
}
```

### GET `/api/odds/sync?stats=true`

Returns sync status and database statistics.

## Data Mapping

The integration maps Odds API data to our internal models:

- **Game** → **Event**: Team names, start time, sport/league
- **Bookmaker Markets** → **Market**: Market type (MONEYLINE, SPREAD, TOTAL)
- **Outcomes** → **Line**: Selection, odds, points (for spreads/totals)

### Market Type Mapping

| Odds API  | Internal    | Description       |
| --------- | ----------- | ----------------- |
| `h2h`     | `MONEYLINE` | Win/loss bets     |
| `spreads` | `SPREAD`    | Point spread bets |
| `totals`  | `TOTAL`     | Over/under bets   |

### Selection Mapping

| Market Type | Odds API Outcome | Internal Selection |
| ----------- | ---------------- | ------------------ |
| MONEYLINE   | Home team name   | `HOME`             |
| MONEYLINE   | Away team name   | `AWAY`             |
| SPREAD      | Home team name   | `HOME`             |
| SPREAD      | Away team name   | `AWAY`             |
| TOTAL       | "Over X.X"       | `OVER`             |
| TOTAL       | "Under X.X"      | `UNDER`            |

## Usage Examples

### Test the integration

```bash
node scripts/test-odds-sync.js
```

### Sync specific sport

```bash
curl -X POST http://localhost:3000/api/odds/sync \
  -H "Content-Type: application/json" \
  -d '{"sport": "americanfootball_nfl"}'
```

### Check stats

```bash
curl http://localhost:3000/api/odds/sync?stats=true
```

## Error Handling

The API includes comprehensive error handling:

- **Configuration errors**: Missing API key
- **Validation errors**: Invalid request parameters
- **API errors**: Odds API failures or rate limits
- **Database errors**: Transaction failures during data storage

## Rate Limiting

The Odds API has usage limits based on your plan. The sync response includes:

- `apiRemainingRequests`: Requests left in current period
- `apiUsedRequests`: Requests consumed in current period

## Development

### Adding New Sports

1. Check [available sports](https://the-odds-api.com/sports-odds-data/sports-apis.html) in Odds API
2. Update the sport parameter in sync requests
3. Test with: `node scripts/test-odds-sync.js americanfootball_nfl`

### Adding New Markets

1. Update the `markets` parameter (e.g., add `player_props`)
2. Add new market type mapping in `mapMarketType()`
3. Update selection mapping logic if needed
4. Add new enum values to Prisma schema if required

### Database Considerations

- Events are deduplicated by team names, start time, and league
- Lines are always created new (historical odds tracking)
- Markets are reused if they exist for an event
- Uses database transactions for data consistency
