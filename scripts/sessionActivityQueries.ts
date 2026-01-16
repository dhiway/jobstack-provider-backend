/**
 * Session Activity Query Scripts
 * 
 * This script provides functions to query user session activity from Redis.
 * Can be used for automation, cron jobs, or manual queries.
 * 
 * Usage:
 *   pnpm session:query <command> [args] 
 *   
 * Commands:
 *   inactive <days>              - Get users inactive for N days
 *   inactive-range <min> <max>   - Get users inactive between min and max days
 *   active <days>                - Get users active in last N days
 *   active-count <days>          - Count users active in last N days
 *   user <userId>                - Get specific user's session activity
 *   cleanup [days]               - Clean up old activity data (default: 90 days)
 */

import Redis from 'ioredis';
import 'dotenv/config';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Redis key prefixes
const SESSION_ACTIVITY_PREFIX = 'session:activity:';
const USER_ACTIVITY_INDEX = 'user:activity:index';

export interface UserSessionActivity {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  name: string;
  lastSeenAt: string;
  sessionId?: string;
}

/**
 * Get session activity for a specific user
 */
export async function getUserSessionActivity(
  userId: string
): Promise<UserSessionActivity | null> {
  const key = `${SESSION_ACTIVITY_PREFIX}${userId}`;
  const data = await redis.get(key);

  if (!data) return null;

  try {
    return JSON.parse(data) as UserSessionActivity;
  } catch {
    return null;
  }
}

/**
 * Get all users who have been inactive for specified number of days
 * @param inactiveDays - Number of days of inactivity (e.g., 7, 30, 90)
 */
export async function getInactiveUsers(
  inactiveDays: number
): Promise<UserSessionActivity[]> {
  const cutoffTime = Date.now() - inactiveDays * 24 * 60 * 60 * 1000;

  const userIds = await redis.zrangebyscore(USER_ACTIVITY_INDEX, 0, cutoffTime);

  if (userIds.length === 0) return [];

  const pipeline = redis.pipeline();
  userIds.forEach((userId) => {
    pipeline.get(`${SESSION_ACTIVITY_PREFIX}${userId}`);
  });

  const results = await pipeline.exec();
  const inactiveUsers: UserSessionActivity[] = [];

  if (results) {
    results.forEach((result) => {
      if (result[1]) {
        try {
          inactiveUsers.push(JSON.parse(result[1] as string) as UserSessionActivity);
        } catch {
          // Skip invalid data
        }
      }
    });
  }

  return inactiveUsers;
}

/**
 * Get users within a specific inactivity range
 * @param minDays - Minimum days of inactivity
 * @param maxDays - Maximum days of inactivity
 */
export async function getInactiveUsersInRange(
  minDays: number,
  maxDays: number
): Promise<UserSessionActivity[]> {
  const minCutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
  const maxCutoff = Date.now() - minDays * 24 * 60 * 60 * 1000;

  const userIds = await redis.zrangebyscore(USER_ACTIVITY_INDEX, minCutoff, maxCutoff);

  if (userIds.length === 0) return [];

  const pipeline = redis.pipeline();
  userIds.forEach((userId) => {
    pipeline.get(`${SESSION_ACTIVITY_PREFIX}${userId}`);
  });

  const results = await pipeline.exec();
  const users: UserSessionActivity[] = [];

  if (results) {
    results.forEach((result) => {
      if (result[1]) {
        try {
          users.push(JSON.parse(result[1] as string) as UserSessionActivity);
        } catch {
          // Skip invalid data
        }
      }
    });
  }

  return users;
}

/**
 * Get active users within specified days
 * @param days - Number of days to look back
 */
export async function getActiveUsers(
  days: number
): Promise<UserSessionActivity[]> {
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

  const userIds = await redis.zrangebyscore(USER_ACTIVITY_INDEX, cutoffTime, '+inf');

  if (userIds.length === 0) return [];

  const pipeline = redis.pipeline();
  userIds.forEach((userId) => {
    pipeline.get(`${SESSION_ACTIVITY_PREFIX}${userId}`);
  });

  const results = await pipeline.exec();
  const users: UserSessionActivity[] = [];

  if (results) {
    results.forEach((result) => {
      if (result[1]) {
        try {
          users.push(JSON.parse(result[1] as string) as UserSessionActivity);
        } catch {
          // Skip invalid data
        }
      }
    });
  }

  return users;
}

/**
 * Get count of active users in the last N days
 */
export async function getActiveUsersCount(days: number): Promise<number> {
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
  return redis.zcount(USER_ACTIVITY_INDEX, cutoffTime, '+inf');
}

/**
 * Clean up old activity data
 * @param olderThanDays - Remove entries older than this (default: 90)
 */
export async function cleanupOldActivityData(
  olderThanDays: number = 90
): Promise<number> {
  const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  const oldUserIds = await redis.zrangebyscore(USER_ACTIVITY_INDEX, 0, cutoffTime);

  if (oldUserIds.length === 0) return 0;

  await redis.zremrangebyscore(USER_ACTIVITY_INDEX, 0, cutoffTime);

  const pipeline = redis.pipeline();
  oldUserIds.forEach((userId) => {
    pipeline.del(`${SESSION_ACTIVITY_PREFIX}${userId}`);
  });
  await pipeline.exec();

  return oldUserIds.length;
}

/**
 * Get all tracked users count
 */
export async function getTotalTrackedUsers(): Promise<number> {
  return redis.zcard(USER_ACTIVITY_INDEX);
}

// CLI Runner
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Session Activity Query Scripts

Usage:
  pnpm session:query <command> [args]

Commands:
  inactive <days>              - Get users inactive for N days
  inactive-range <min> <max>   - Get users inactive between min and max days
  active <days>                - Get users active in last N days
  active-count <days>          - Count users active in last N days
  user <userId>                - Get specific user's session activity
  cleanup [days]               - Clean up old activity data (default: 90 days)
  total                        - Get total tracked users count

Examples:
  pnpm session:query inactive 7
  pnpm session:query inactive-range 7 14
  pnpm session:query active 30
  pnpm session:query active-count 7
  pnpm session:query user abc123
  pnpm session:query cleanup 90
    `);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'inactive': {
        const days = parseInt(args[1]);
        if (isNaN(days)) {
          console.error('Error: Please provide number of days');
          process.exit(1);
        }
        const users = await getInactiveUsers(days);
        console.log(`\nUsers inactive for ${days}+ days: ${users.length}\n`);
        console.table(users.map(u => ({
          userId: u.userId,
          name: u.name,
          email: u.email,
          phone: u.phoneNumber,
          lastSeen: u.lastSeenAt
        })));
        break;
      }

      case 'inactive-range': {
        const minDays = parseInt(args[1]);
        const maxDays = parseInt(args[2]);
        if (isNaN(minDays) || isNaN(maxDays)) {
          console.error('Error: Please provide min and max days');
          process.exit(1);
        }
        const users = await getInactiveUsersInRange(minDays, maxDays);
        console.log(`\nUsers inactive between ${minDays}-${maxDays} days: ${users.length}\n`);
        console.table(users.map(u => ({
          userId: u.userId,
          name: u.name,
          email: u.email,
          phone: u.phoneNumber,
          lastSeen: u.lastSeenAt
        })));
        break;
      }

      case 'active': {
        const days = parseInt(args[1]);
        if (isNaN(days)) {
          console.error('Error: Please provide number of days');
          process.exit(1);
        }
        const users = await getActiveUsers(days);
        console.log(`\nUsers active in last ${days} days: ${users.length}\n`);
        console.table(users.map(u => ({
          userId: u.userId,
          name: u.name,
          email: u.email,
          phone: u.phoneNumber,
          lastSeen: u.lastSeenAt
        })));
        break;
      }

      case 'active-count': {
        const days = parseInt(args[1]);
        if (isNaN(days)) {
          console.error('Error: Please provide number of days');
          process.exit(1);
        }
        const count = await getActiveUsersCount(days);
        console.log(`\nActive users in last ${days} days: ${count}`);
        break;
      }

      case 'user': {
        const userId = args[1];
        if (!userId) {
          console.error('Error: Please provide userId');
          process.exit(1);
        }
        const user = await getUserSessionActivity(userId);
        if (user) {
          console.log('\nUser Session Activity:\n');
          console.log(JSON.stringify(user, null, 2));
        } else {
          console.log(`\nNo activity found for user: ${userId}`);
        }
        break;
      }

      case 'cleanup': {
        const days = parseInt(args[1]) || 90;
        const removed = await cleanupOldActivityData(days);
        console.log(`\nCleaned up ${removed} users inactive for ${days}+ days`);
        break;
      }

      case 'total': {
        const count = await getTotalTrackedUsers();
        console.log(`\nTotal tracked users: ${count}`);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

// Run if executed directly
main();
