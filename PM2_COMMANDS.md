# PM2 Commands Reference

This document contains common PM2 commands for managing the API and session cleanup cron job.

## Starting the Application

```bash
# Start main app + session cleanup cron
npm run start:prod

# Or manually start each
pm2 start "node --env-file=.env index.js" --name api-bolaocopa26 --watch
pm2 start npm --name session-cleanup --cron "0 2 * * *" -- run cleanup:sessions
```

## Viewing Status

```bash
# List all PM2 processes
pm2 list

# Show detailed info
pm2 show api-bolaocopa26
pm2 show session-cleanup

# Monitor in real-time (CPU, memory, etc.)
pm2 monit
```

## Viewing Logs

```bash
# View all logs
pm2 logs

# View logs for specific process
pm2 logs api-bolaocopa26
pm2 logs session-cleanup

# View only errors
pm2 logs api-bolaocopa26 --err

# View last 100 lines
pm2 logs api-bolaocopa26 --lines 100

# Clear all logs
pm2 flush
```

## Stopping/Restarting

```bash
# Restart main app
pm2 restart api-bolaocopa26

# Restart all processes
pm2 restart all

# Stop main app
pm2 stop api-bolaocopa26

# Stop all processes
pm2 stop all

# Reload (zero-downtime restart)
pm2 reload api-bolaocopa26
```

## Deleting Processes

```bash
# Delete specific process
pm2 delete api-bolaocopa26
pm2 delete session-cleanup

# Delete all processes
pm2 delete all
```

## Saving Configuration

```bash
# Save current process list (auto-restart on server reboot)
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Remove PM2 from startup
pm2 unstartup systemd
```

## Session Cleanup

```bash
# Run session cleanup manually
npm run cleanup:sessions

# Or with PM2
pm2 trigger session-cleanup
```

## Deployment Workflow

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Stop current processes
pm2 stop all

# 5. Start with new code
cd dist
npm run start:prod

# 6. Save configuration
pm2 save
```

## Troubleshooting

```bash
# Check PM2 version
pm2 --version

# Show PM2 configuration
pm2 conf

# Check for PM2 updates
pm2 update

# Restart PM2 daemon
pm2 kill
pm2 resurrect

# View PM2 logs location
pm2 show api-bolaocopa26 | grep "log path"
```

## Log Rotation (Optional)

```bash
# Install log rotation module
pm2 install pm2-logrotate

# Configure rotation settings
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD

# Check configuration
pm2 conf pm2-logrotate
```

## Useful Aliases

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# PM2 shortcuts
alias pm2-list='pm2 list'
alias pm2-logs='pm2 logs api-bolaocopa26 --raw | pino-pretty'
alias pm2-restart='pm2 restart api-bolaocopa26'
alias pm2-status='pm2 show api-bolaocopa26'
```

## Process Details

### Main Application

- **Name:** `api-bolaocopa26`
- **Type:** Node.js application
- **Watch mode:** Enabled (restarts on file changes)
- **Logs:** `~/.pm2/logs/api-bolaocopa26-out.log` and `~/.pm2/logs/api-bolaocopa26-error.log`

### Session Cleanup

- **Name:** `session-cleanup`
- **Type:** Cron job
- **Schedule:** Daily at 2 AM (`0 2 * * *`)
- **Purpose:** Clean up expired sessions from database
- **Logs:** `~/.pm2/logs/session-cleanup-out.log`

## Notes

- Cron jobs in PM2 show as "stopped" until they execute
- Use `pm2 logs session-cleanup` to verify cron job executions
- Main app logs are in JSON format (use `pino-pretty` to view)
- PM2 saves process list in `~/.pm2/dump.pm2`
