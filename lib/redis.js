import { createClient } from "redis";

let client;

if (!global.redis) {
  global.redis = createClient({
    url: process.env.REDIS_URL,
  });

  global.redis.on("error", (err) =>
    console.error("Redis Client Error", err)
  );

  global.redis.connect();
}

client = global.redis;

export default client;
