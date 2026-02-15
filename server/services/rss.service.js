import Parser from "rss-parser";
import News from "../models/News.js";
import { summarizeText } from "./ai.service.js";

const parser = new Parser({ timeout: 15000 });
const MIN_CONTENT_LENGTH = 80;

/**
 * Strip basic HTML tags to get plain text (fallback when contentSnippet is empty).
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

/**
 * Extract first image URL from HTML (e.g. RSS item content).
 * @param {string} html
 * @returns {string | undefined}
 */
function getFirstImageFromHtml(html) {
  if (!html || typeof html !== "string") return undefined;
  const match = html.match(/<img[^>]+src=["']([^"'>\s]+)["']/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Fetch RSS feed, summarize new items with AI, save to News.
 * @param {string} feedUrl - RSS feed URL
 * @returns {Promise<{ createdCount: number, feedTitle: string }>}
 */
export async function fetchFeed(feedUrl) {
  if (!feedUrl || typeof feedUrl !== "string" || !feedUrl.trim()) {
    throw new Error("Feed URL is required");
  }
  const url = feedUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Feed URL must use http or https");
  }

  let feed;
  try {
    feed = await parser.parseURL(url);
  } catch (err) {
    console.error("RSS fetch error:", err.message);
    throw new Error("Failed to fetch or parse RSS feed");
  }

  const feedTitle = feed.title || "RSS Feed";
  const items = feed.items || [];
  let createdCount = 0;

  for (const item of items) {
    const sourceUrl = item.link;
    if (!sourceUrl) continue;

    const existing = await News.findOne({ sourceUrl });
    if (existing) continue;

    const enclosure = item.enclosure;
    let imageUrl =
      enclosure?.url && enclosure?.type?.toLowerCase?.().startsWith?.("image")
        ? enclosure.url
        : undefined;
    if (!imageUrl && (item.content || item["content:encoded"])) {
      const firstImg = getFirstImageFromHtml(item.content || item["content:encoded"]);
      if (firstImg) imageUrl = firstImg.startsWith("http") ? firstImg : undefined;
    }

    let text = (item.contentSnippet || "").trim();
    if (!text || text.length < MIN_CONTENT_LENGTH) {
      text = stripHtml(item.content || "");
    }
    if (!text || text.length < MIN_CONTENT_LENGTH) {
      continue;
    }

    try {
      const summaryResult = await summarizeText(text);
      await News.create({
        title: summaryResult.title,
        content: text,
        summary: summaryResult.summary,
        whyItMatters: summaryResult.whyItMatters,
        sourceUrl,
        source: "rss",
        sourceName: feedTitle,
        imageUrl,
        createdBy: null
      });
      createdCount++;
      console.log(`RSS: saved "${item.title}" from ${feedTitle}`);
    } catch (err) {
      console.error(`RSS: failed to summarize item ${sourceUrl}:`, err.message);
    }
  }

  return { createdCount, feedTitle };
}
