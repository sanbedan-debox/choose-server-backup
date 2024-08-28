import ioredis, { RedisOptions } from "ioredis";

const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  password: process.env.REDIS_PASSWORD || "",
};

const redisClient = new ioredis({
  ...redisOptions,
  maxRetriesPerRequest: null,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

class RedisKeys {
  // Master Keys
  static readonly M_STATES_KEY = "M_STATES";
  static readonly M_CUISINES_KEY = "M_CUISINES";
  static readonly M_TIMEZONES_KEY = "M_TIMEZONES";
  static readonly M_PERMISSIONS_KEY = "M_PERMISSIONS";
  static readonly M_CONFIGS_KEY = "M_CONFIGS";
  static readonly M_ITEM_OPTIONS_KEY = "M_ITEM_OPTIONS";

  // Exp Time in Seconds
  static readonly EXP_TIME = 86400 * 7; // (86400 = 1 Day) * 7 = 7 Days

  // Rate Limit Key
  static readonly RL_KEY = "rate_limit";

  // TOTP Secret Key
  static readonly TOTP_KEY = "totp_secret";
}

export { redisClient, RedisKeys, redisOptions };
