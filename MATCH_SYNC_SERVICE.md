# Match Sync Service Documentation

## Overview

The Match Sync Service is an automated background service that periodically fetches match data from an external API, updates your local cache and database, and broadcasts changes to all connected WebSocket clients.

## Architecture

### Components

1. **MatchSyncService** (`match.sync.service.ts`)
   - Main orchestrator that runs every 30 seconds (configurable)
   - Singleton pattern for single instance across the application
   - Handles sync lifecycle: fetch → compare → update → broadcast

2. **MatchExternalAPI** (`match.external-api.ts`)
   - HTTP client for fetching match data from external API
   - Built-in timeout handling (10 seconds)
   - Health check capabilities
   - Error handling and retry logic

3. **MatchService** (`match.service.ts`)
   - Extended with `updateMatch()` method
   - Handles database persistence of match updates

## Features

### Core Functionality

- ✅ **Automatic Sync**: Runs every 30 seconds (configurable)
- ✅ **Change Detection**: Only updates matches that have actually changed
- ✅ **Cache Management**: Updates NodeCache with latest match data
- ✅ **Database Sync**: Persists changes to MySQL database
- ✅ **WebSocket Broadcasting**: Notifies all connected clients of updates
- ✅ **Overlap Protection**: Prevents concurrent sync operations
- ✅ **Error Recovery**: Continues running even if individual syncs fail
- ✅ **Graceful Shutdown**: Properly stops on application termination

### Change Detection

The service detects changes by comparing:

- Match status
- Home/away scores
- Home/away penalties
- Timestamp

If any of these fields differ between cached and fetched data, the match is marked for update.

## Configuration

### Environment Variables

```bash
# Enable/disable the sync service (default: true)
MATCH_SYNC_ENABLED=true

# Sync interval in milliseconds (default: 30000 = 30 seconds)
MATCH_SYNC_INTERVAL=30000

# Edition/season to sync matches for
EDITION=1

# External API base URL
EXTERNAL_API_URL=https://api.example.com

# Optional: API key for authentication
EXTERNAL_API_KEY=your-api-key-here
```

### Disabling the Service

To disable the sync service without code changes:

```bash
MATCH_SYNC_ENABLED=false
```

### Adjusting Sync Interval

To sync every 60 seconds instead of 30:

```bash
MATCH_SYNC_INTERVAL=60000
```

## Usage

### Starting the Service

The service starts automatically when your application launches (in `index.ts`):

```typescript
import { MatchSyncService } from "#match/match.sync.service.js";

const matchSyncService = MatchSyncService.getInstance();
matchSyncService.start();
```

### Stopping the Service

The service stops automatically during graceful shutdown, but you can also stop it manually:

```typescript
matchSyncService.stop();
```

### Getting Sync Statistics

```typescript
const stats = matchSyncService.getStats();
console.log(stats);
// {
//   lastSync: 1234567890,
//   duration: 1250,
//   totalFetched: 64,
//   updated: 3,
//   errors: 0
// }
```

## External API Integration

### Expected API Response Format

Your external API should return data in this format:

```typescript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "idFifa": 123,
      "timestamp": 1678886400,
      "round": 1,
      "scoreHome": 2,
      "scoreAway": 1,
      "penaltiesHome": 0,
      "penaltiesAway": 0,
      "idReferee": 5,
      "idStadium": 10,
      "status": 1,
      "idHome": 20,
      "idAway": 21
    }
    // ... more matches
  ]
}
```

### Customizing the API Client

To adapt to your specific external API, modify `match.external-api.ts`:

1. **Update the URL structure** in `fetchMatches()`:

   ```typescript
   const url = `${API_CONFIG.baseUrl}/your-custom-endpoint`;
   ```

2. **Adjust response parsing** if your API returns different field names:

   ```typescript
   const data: YourCustomResponse = await response.json();
   return data.matches.map(transformToIMatchRaw);
   ```

3. **Add authentication headers** if needed (already supports Bearer tokens via `EXTERNAL_API_KEY`).

## WebSocket Broadcasting

### Message Format

When matches are updated, all connected clients receive:

```json
{
  "type": "matches_update",
  "timestamp": 1678886400000,
  "data": [...],  // Array of all matches
  "updatedCount": 3  // Number of matches that changed
}
```

### Client-Side Handling

Example WebSocket client handling:

```javascript
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "matches_update") {
    console.log(`Received ${message.updatedCount} match updates`);
    updateMatchesUI(message.data);
  }
};
```

## Logging

The service provides detailed logging for monitoring:

```
[Match Sync] Starting service (interval: 30000ms, edition: 1)
[Match Sync] Starting sync...
[External API] Fetching matches for edition 1...
[External API] Successfully fetched 64 matches
[Match Sync] Detected 3 changed matches
[Match Sync] Updated match 45 in database
[Match Sync] Updated match 46 in database
[Match Sync] Updated match 47 in database
[Match Sync] Broadcasted 64 matches to WebSocket clients
[Match Sync] Completed in 1250ms
```

## Error Handling

### Resilience Features

1. **Overlap Protection**: If a sync is already running, subsequent triggers are skipped
2. **Individual Match Failures**: If one match update fails, others continue
3. **Service Continuity**: Errors in a single sync don't stop the service
4. **Timeout Protection**: API requests timeout after 10 seconds

### Common Issues

**Issue**: Service not starting

- Check `EDITION` environment variable is set
- Verify `MATCH_SYNC_ENABLED` is not set to `false`

**Issue**: External API timeouts

- Adjust timeout in `match.external-api.ts` (default: 10 seconds)
- Check network connectivity to external API

**Issue**: Database update failures

- Verify database connection is healthy
- Check match data structure matches database schema

## Performance Considerations

### Resource Usage

- **Memory**: Maintains in-memory cache of all matches
- **Database**: One UPDATE query per changed match
- **Network**: One API call every 30 seconds

### Optimization Tips

1. **Increase interval** for less frequent updates:

   ```bash
   MATCH_SYNC_INTERVAL=60000  # 60 seconds
   ```

2. **Use during active match days only**: Conditionally enable based on schedule

3. **Batch database updates**: Already implemented using `Promise.allSettled()`

## Testing

### Manual Testing

1. **Start the service** and watch logs:

   ```bash
   npm run dev
   ```

2. **Verify sync is running**:
   - Check for `[Match Sync] Starting sync...` in logs every 30 seconds

3. **Test change detection**:
   - Modify data in external API
   - Wait for next sync
   - Verify database and cache are updated

### Health Check

Test external API connectivity:

```typescript
const api = new MatchExternalAPI();
const isHealthy = await api.healthCheck();
console.log("API is healthy:", isHealthy);
```

## Production Deployment

### Checklist

- [ ] Set `EXTERNAL_API_URL` to production endpoint
- [ ] Configure `EXTERNAL_API_KEY` if authentication is required
- [ ] Set appropriate `MATCH_SYNC_INTERVAL` for your use case
- [ ] Verify database connection pool can handle sync load
- [ ] Monitor logs for errors after deployment
- [ ] Test WebSocket broadcasting with real clients

### Monitoring

Key metrics to monitor:

- Sync duration (should be < 5 seconds typically)
- Error count (should remain at 0)
- Changes per sync (varies based on match activity)
- WebSocket client count

## Troubleshooting

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
```

### Common Solutions

**Sync not running:**

```bash
# Check if service is enabled
echo $MATCH_SYNC_ENABLED

# Check if edition is set
echo $EDITION
```

**Database not updating:**

- Check database connection logs
- Verify `updateMatch()` method matches your schema
- Ensure proper permissions for UPDATE queries

**WebSocket not broadcasting:**

- Verify WebSocket server is initialized before sync service
- Check client connection in browser DevTools

## Future Enhancements

Potential improvements:

- [ ] Add retry logic for failed API requests
- [ ] Implement exponential backoff for errors
- [ ] Add metrics endpoint for monitoring
- [ ] Support multiple editions/seasons simultaneously
- [ ] Add webhook support for push updates instead of polling
- [ ] Implement differential updates (only send changed matches to clients)

## Support

For issues or questions:

1. Check logs for detailed error messages
2. Verify environment configuration
3. Test external API connectivity manually
4. Review database schema compatibility
