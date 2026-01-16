import redis from './redis';

// Redis key prefixes
const SESSION_ACTIVITY_PREFIX = 'session:activity:';
const USER_ACTIVITY_INDEX = 'user:activity:index';

export interface UserSessionActivity {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  name: string;
  lastSeenAt: string; // ISO timestamp
  sessionId?: string;
}

/**
 * Store or update user session activity in Redis
 * This is called on every authenticated request to track last activity
 */
export async function updateUserSessionActivity(
  user: {
    id: string;
    email?: string | null;
    phoneNumber?: string | null;
    name: string;
  },
  sessionId?: string
): Promise<void> {
  const now = new Date().toISOString();
  const activityData: UserSessionActivity = {
    userId: user.id,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    name: user.name,
    lastSeenAt: now,
    sessionId,
  };

  const key = `${SESSION_ACTIVITY_PREFIX}${user.id}`;

  // Store user activity data with 90 days TTL (for cleanup of very old data)
  await redis.set(key, JSON.stringify(activityData), 'EX', 90 * 24 * 60 * 60);

  // Add user ID to sorted set with timestamp as score for efficient querying
  await redis.zadd(USER_ACTIVITY_INDEX, Date.now(), user.id);
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
 * Remove user activity data (e.g., when user is deleted)
 */
export async function removeUserSessionActivity(userId: string): Promise<void> {
  const key = `${SESSION_ACTIVITY_PREFIX}${userId}`;
  await redis.del(key);
  await redis.zrem(USER_ACTIVITY_INDEX, userId);
}
