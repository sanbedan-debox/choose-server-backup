import { redisClient, RedisKeys } from "./redis";

// Configuration
const MAX_ATTEMPTS = 5; // Maximum allowed attempts before lockout
const LOCKOUT_DURATION = 15 * 60; // Lockout duration in seconds (e.g., 15 minutes)
const WINDOW_DURATION = 60 * 60; // Time window for rate limiting (e.g., 1 hour)

export const checkRateLimit = async (rlKey: string): Promise<boolean> => {
  try {
    const key = `${RedisKeys.RL_KEY}:${rlKey}`;
    const attempts = await redisClient.get(key);

    if (attempts && parseInt(attempts) >= MAX_ATTEMPTS) {
      return false; // Rate limit exceeded
    }

    return true; // Rate limit not exceeded
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const incrementRateLimit = async (rlKey: string) => {
  try {
    const key = `${RedisKeys.RL_KEY}:${rlKey}`;
    const attempts = await redisClient.incr(key);

    if (attempts === 1) {
      await redisClient.expire(key, WINDOW_DURATION);
    }

    if (attempts >= MAX_ATTEMPTS) {
      const backoffDuration =
        LOCKOUT_DURATION * Math.pow(2, attempts - MAX_ATTEMPTS);
      await redisClient.expire(key, backoffDuration);
    }
  } catch (error) {
    console.log(error);
  }
};

export const resetRateLimit = async (rlKey: string) => {
  try {
    const key = `${RedisKeys.RL_KEY}:${rlKey}`;
    await redisClient.del(key);
  } catch (error) {
    console.log(error);
  }
};
