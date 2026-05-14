# Logging System Documentation

This project uses **Pino** as its logging framework. Pino is a fast, low-overhead logger for Node.js applications that outputs structured JSON logs.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Log Levels](#log-levels)
- [Using the Logger](#using-the-logger)
- [HTTP Request Logging](#http-request-logging)
- [Security & Redaction](#security--redaction)
- [Configuration](#configuration)
- [Production Best Practices](#production-best-practices)
- [Viewing Logs](#viewing-logs)
- [Troubleshooting](#troubleshooting)

---

## Overview

The logging system is built on three main components:

1. **Logger Service** (`src/logger/logger.service.ts`) - Core logger configuration
2. **HTTP Middleware** (`src/logger/logger.middleware.ts`) - Automatic request/response logging
3. **Error Handler** (`src/middlewares/errorHandler.ts`) - Error logging integration

### Key Features

- ✅ **Structured JSON logs** in production for easy parsing
- ✅ **Pretty-printed logs** in development for readability
- ✅ **Automatic HTTP request/response logging**
- ✅ **Sensitive data redaction** (passwords, tokens, cookies)
- ✅ **Different log levels** (trace, debug, info, warn, error, fatal)
- ✅ **Contextual logging** with user IDs, request IDs, etc.
- ✅ **Error stack traces** with proper serialization

---

## Quick Start

### Basic Usage

```typescript
import { logger } from "#logger/logger.service.js";

// Simple info log
logger.info("Application started successfully");

// Log with context
logger.info({ userId: 123, action: "login" }, "User logged in");

// Error logging
logger.error({ err: error }, "Failed to process request");

// Warning
logger.warn({ resource: "database" }, "Connection pool running low");
```

### In Controllers/Services

```typescript
import { logger } from "#logger/logger.service.js";

export class UserService {
  async createUser(userData: CreateUserDto) {
    logger.info({ email: userData.email }, "Creating new user");

    try {
      const user = await this.userRepository.create(userData);
      logger.info({ userId: user.id }, "User created successfully");
      return user;
    } catch (error) {
      logger.error({ err: error, email: userData.email }, "Failed to create user");
      throw error;
    }
  }
}
```

---

## Log Levels

Pino supports six log levels (in order of severity):

| Level   | Value | Use Case                                                |
| ------- | ----- | ------------------------------------------------------- |
| `trace` | 10    | Very detailed debugging (usually disabled)              |
| `debug` | 20    | Detailed information for debugging                      |
| `info`  | 30    | General informational messages                          |
| `warn`  | 40    | Warning messages for potentially harmful situations     |
| `error` | 50    | Error events that might still allow the app to continue |
| `fatal` | 60    | Critical errors that cause application exit             |

### Default Log Levels

- **Development**: `debug` (shows debug and above)
- **Production**: `info` (shows info and above)

### Changing Log Level

Set the `LOG_LEVEL` environment variable:

```bash
# In .env file
LOG_LEVEL=debug  # Show debug logs and above
LOG_LEVEL=warn   # Show only warnings and errors
LOG_LEVEL=error  # Show only errors and fatal
```

---

## Using the Logger

### Basic Logging

```typescript
// Simple message
logger.info("Server started");

// With context object
logger.info({ port: 3000 }, "Server listening on port");

// Multiple context fields
logger.info({ userId: 123, action: "purchase", amount: 99.99 }, "User made a purchase");
```

### Error Logging

Always use the `err` field for errors to get proper stack traces:

```typescript
try {
  await riskyOperation();
} catch (error) {
  // ✅ Correct: Logs error with stack trace
  logger.error({ err: error }, "Operation failed");

  // ❌ Wrong: Loses stack trace
  logger.error({ error: error.message }, "Operation failed");
}
```

### Child Loggers (Adding Context)

Create child loggers to automatically include context in all logs:

```typescript
import { createChildLogger } from "#logger/logger.service.js";

// In a middleware or service
const requestLogger = createChildLogger({
  requestId: req.id,
  userId: req.session.user?.id,
});

// All logs from this child will include requestId and userId
requestLogger.info("Processing request");
requestLogger.error({ err: error }, "Request failed");
```

### Conditional Logging

```typescript
// Only log in development
if (process.env.NODE_ENV === "development") {
  logger.debug({ data: sensitiveData }, "Debug information");
}

// Check if level is enabled
if (logger.isLevelEnabled("debug")) {
  const expensiveDebugInfo = computeExpensiveData();
  logger.debug({ data: expensiveDebugInfo }, "Debug data");
}
```

---

## HTTP Request Logging

HTTP requests and responses are automatically logged by the `httpLogger` middleware.

### What Gets Logged

For each request, the following is automatically logged:

- HTTP method (GET, POST, etc.)
- URL path
- Query parameters
- Route parameters
- Response status code
- Response time (in milliseconds)
- User ID (if authenticated)
- Request headers (selected)

### Log Level by Status Code

- `2xx` (Success) → `info`
- `3xx` (Redirect) → `info`
- `4xx` (Client Error) → `warn`
- `5xx` (Server Error) → `error`

### Example HTTP Log Output

**Development** (pretty-printed):

```
[1234] INFO (api/12345 on hostname): GET /api/users/123 200
    method: "GET"
    url: "/api/users/123"
    statusCode: 200
    responseTime: 45
    userId: 123
```

**Production** (JSON):

```json
{
  "level": 30,
  "time": "2026-05-14T10:30:45.123Z",
  "pid": 12345,
  "hostname": "server-01",
  "req": {
    "method": "GET",
    "url": "/api/users/123"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 45,
  "userId": 123,
  "msg": "GET /api/users/123 200"
}
```

### Ignoring Certain Routes

Health checks and other noisy endpoints are automatically ignored. To add more:

Edit `src/logger/logger.middleware.ts`:

```typescript
autoLogging: {
  ignore: (req) => {
    const ignoredPaths = ["/health", "/metrics", "/favicon.ico", "/ping"];
    return ignoredPaths.some((path) => req.url?.startsWith(path));
  },
}
```

---

## Security & Redaction

Sensitive data is automatically redacted from logs to prevent accidental exposure.

### Redacted Fields

The following fields are automatically replaced with `[REDACTED]`:

- `req.headers.authorization` (Bearer tokens)
- `req.headers.cookie` (Session cookies)
- `req.body.password`
- `req.body.newPassword`
- `req.body.oldPassword`
- `res.headers['set-cookie']`

### Adding More Redacted Fields

Edit `src/logger/logger.service.ts`:

```typescript
redact: {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.body.password",
    "req.body.newPassword",
    "req.body.oldPassword",
    "req.body.creditCard",        // Add custom fields
    "req.body.ssn",
    "user.passwordHash",
    "res.headers['set-cookie']",
  ],
  censor: "[REDACTED]",
}
```

---

## Configuration

### Environment Variables

| Variable    | Default                       | Description                          |
| ----------- | ----------------------------- | ------------------------------------ |
| `NODE_ENV`  | `development`                 | Controls log format (pretty vs JSON) |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Minimum log level to output          |

### Log Format

- **Development** (`NODE_ENV=development`):
  - Human-readable format with colors
  - Easier to read in terminal
  - Uses `pino-pretty`

- **Production** (`NODE_ENV=production`):
  - JSON format
  - Optimized for log aggregation tools
  - Better performance

### Customizing the Logger

Edit `src/logger/logger.service.ts` to customize:

```typescript
const logger = pino({
  level: "trace", // Change minimum level

  base: {
    // Add default fields to all logs
    env: environment,
    version: "1.0.0",
    service: "api-bolaocopa26",
  },

  // Add custom serializers
  serializers: {
    user: (user) => ({
      id: user.id,
      email: user.email,
      // Don't include password, tokens, etc.
    }),
  },
});
```

---

## Production Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ❌ Don't do this in production
logger.debug({ hugeObject: data }, "Processing data");

// ✅ Do this instead
logger.info({ recordCount: data.length }, "Processing records");
```

### 2. Keep Log Messages Concise

```typescript
// ❌ Avoid verbose messages
logger.info("The user with ID 123 successfully completed the registration process");

// ✅ Use structured data
logger.info({ userId: 123, action: "registration" }, "User registered");
```

### 3. Don't Log Sensitive Data

```typescript
// ❌ Never log passwords or tokens
logger.info({ password: user.password }, "User created");

// ✅ Log only safe identifiers
logger.info({ userId: user.id, email: user.email }, "User created");
```

### 4. Log Rotation (Coming Soon)

For production, implement log rotation to prevent disk space issues:

```bash
# Install log rotation package
npm install pino-roll

# Or use PM2's built-in log rotation
pm2 start app.js --log-date-format "YYYY-MM-DD HH:mm:ss"
```

### 5. Log Aggregation

For production systems, consider sending logs to a centralized service:

- **Grafana Loki** (Free, Open Source)
- **Elasticsearch + Kibana** (ELK Stack)
- **Graylog** (Open Source)
- **Sentry** (Error tracking)

---

## Viewing Logs

### Development (Pretty Print)

Logs are automatically pretty-printed to the console:

```bash
npm run dev
```

### Production (JSON)

In production, logs are JSON formatted:

```bash
npm start
```

### Searching Logs

**Using `grep`:**

```bash
# Find all error logs
grep '"level":50' logs/app.log

# Find logs for specific user
grep '"userId":123' logs/app.log

# Find all POST requests
grep '"method":"POST"' logs/app.log
```

**Using `jq` (JSON processor):**

```bash
# Pretty print all logs
cat logs/app.log | jq

# Filter error logs only
cat logs/app.log | jq 'select(.level >= 50)'

# Get all requests to /api/users
cat logs/app.log | jq 'select(.req.url | startswith("/api/users"))'

# Count errors by message
cat logs/app.log | jq -r 'select(.level >= 50) | .msg' | sort | uniq -c
```

**Using `tail` (real-time monitoring):**

```bash
# Follow logs in real-time
tail -f logs/app.log

# Follow with pretty printing
tail -f logs/app.log | npx pino-pretty
```

---

## Troubleshooting

### Logs Not Appearing

**Check log level:**

```bash
# Set to debug temporarily
LOG_LEVEL=debug npm run dev
```

**Verify logger is imported:**

```typescript
import { logger } from "#logger/logger.service.js";
```

### Too Many Logs in Production

**Increase log level:**

```bash
# In .env
LOG_LEVEL=warn  # Only warnings and errors
```

**Ignore more routes:**
Edit `src/logger/logger.middleware.ts` to ignore noisy endpoints.

### Pretty Printing Not Working

**Check NODE_ENV:**

```bash
# Make sure you're in development
echo $NODE_ENV  # should be "development" or empty
```

**Force pretty printing:**

```bash
npm run dev | npx pino-pretty
```

### Logs Too Large

**Implement log rotation:**

```bash
# Using PM2
pm2 start app.js --log-date-format "YYYY-MM-DD" --max-log-size 10M
```

**Or delete old logs periodically:**

```bash
# Add to crontab
find /path/to/logs -name "*.log" -mtime +7 -delete
```

---

## Examples

### Service Layer Logging

```typescript
export class BetService {
  async placeBet(userId: number, betData: PlaceBetDto) {
    const serviceLogger = createChildLogger({ userId, service: "BetService" });

    serviceLogger.info({ matchId: betData.matchId }, "Placing bet");

    try {
      // Validate bet
      const isValid = await this.validateBet(betData);
      if (!isValid) {
        serviceLogger.warn({ betData }, "Invalid bet attempted");
        throw new AppError("Invalid bet", 400);
      }

      // Save bet
      const bet = await this.betRepository.create(betData);
      serviceLogger.info({ betId: bet.id }, "Bet placed successfully");

      return bet;
    } catch (error) {
      serviceLogger.error({ err: error, betData }, "Failed to place bet");
      throw error;
    }
  }
}
```

### Controller Logging

```typescript
export class UserController extends BaseController {
  async register(req: Request, res: Response) {
    logger.info({ email: req.body.email }, "User registration attempt");

    try {
      const user = await this.userService.createUser(req.body);

      logger.info({ userId: user.id, email: user.email }, "User registered successfully");

      return ApiResponse.success(res, "Registration successful", { user });
    } catch (error) {
      logger.error({ err: error, email: req.body.email }, "User registration failed");
      throw error;
    }
  }
}
```

### Database Query Logging

```typescript
export class Database {
  async query(sql: string, params: unknown[]) {
    const startTime = Date.now();

    try {
      const result = await this.connection.query(sql, params);
      const duration = Date.now() - startTime;

      logger.debug({ sql, params, duration }, "Database query executed");

      return result;
    } catch (error) {
      logger.error({ err: error, sql, params }, "Database query failed");
      throw error;
    }
  }
}
```

---

## Summary

✅ **Logging is automatic** for all HTTP requests  
✅ **Use `logger.info()`, `logger.error()`, etc.** in your code  
✅ **Always use `{ err: error }`** for proper error logging  
✅ **Sensitive data is automatically redacted**  
✅ **Development logs are pretty, production logs are JSON**  
✅ **Configure with `LOG_LEVEL` environment variable**

For more information, see the [Pino documentation](https://getpino.io/).
