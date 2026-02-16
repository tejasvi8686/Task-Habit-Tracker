import cron from "node-cron";
import { fetchLatestVideos } from "../services/youtube.service.js";
import { fetchFeed } from "../services/rss.service.js";

const CRON_SCHEDULE = "0 */4 * * *"; // Every 4 hours at minute 0

function parseList(envValue) {
  if (!envValue || typeof envValue !== "string") return [];
  return envValue 
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function runRefresh() {
  const channelIds = parseList(process.env.YOUTUBE_CHANNEL_IDS);
  const feedUrls = parseList(process.env.RSS_FEED_URLS);

  if (channelIds.length === 0 && feedUrls.length === 0) {
    return;
  }

  console.log("[Cron] News refresh started");

  for (const channelId of channelIds) {
    try {
      const count = await fetchLatestVideos(channelId);
      console.log(`[Cron] YouTube ${channelId}: ${count} new`);
    } catch (err) {
      console.error(`[Cron] YouTube ${channelId} failed:`, err.message);
    }
  }

  for (const feedUrl of feedUrls) {
    try {
      const { createdCount, feedTitle } = await fetchFeed(feedUrl);
      console.log(`[Cron] RSS ${feedTitle}: ${createdCount} new`);
    } catch (err) {
      console.error(`[Cron] RSS ${feedUrl} failed:`, err.message);
    }
  }

  console.log("[Cron] News refresh finished");
}

export function startNewsRefreshCron() {
  const channelIds = parseList(process.env.YOUTUBE_CHANNEL_IDS);
  const feedUrls = parseList(process.env.RSS_FEED_URLS);

  if (channelIds.length === 0 && feedUrls.length === 0) {
    console.log("[Cron] No YOUTUBE_CHANNEL_IDS or RSS_FEED_URLS set; scheduled refresh disabled.");
    return;
  }

  cron.schedule(CRON_SCHEDULE, runRefresh, { timezone: "UTC" });
  console.log("[Cron] News refresh scheduled every 4 hours (UTC)");

  // Optional: run once on startup after a short delay so DB is ready
  setTimeout(runRefresh, 10000);
}
