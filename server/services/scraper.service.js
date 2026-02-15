import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const FETCH_TIMEOUT_MS = 15000;
const MAX_CONTENT_LENGTH = 2 * 1024 * 1024; // 2MB
const MIN_ARTICLE_LENGTH = 100;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BLOCK_PAGE_TITLE_PATTERNS = [
  /access\s*denied/i,
  /^\s*403\s*$/i,
  /forbidden/i,
  /blocked/i,
  /captcha/i,
  /robot|bot\s*detection/i,
  /just\s*a\s*moment/i,
  /attention\s*required/i,
  /security\s*check/i,
  /please\s*verify/i,
];

const BLOCK_PAGE_BODY_PATTERNS = [
  /access\s*denied/i,
  /you\s*have\s*been\s*blocked/i,
  /captcha/i,
  /enable\s*cookies/i,
  /robot|bot\s*detection/i,
  /security\s*check/i,
  /just\s*a\s*moment/i,
  /attention\s*required/i,
  /403\s*forbidden/i,
  /unauthorized/i,
  /please\s*verify\s*you\s*are\s*human/i,
];

function looksLikeBlockPage(title, textContent) {
  const t = (title || "").trim();
  const b = (textContent || "").trim().slice(0, 2000);
  if (BLOCK_PAGE_TITLE_PATTERNS.some((re) => re.test(t))) return true;
  if (BLOCK_PAGE_BODY_PATTERNS.some((re) => re.test(b))) return true;
  return false;
}

/**
 * Validates URL and returns normalized href. Throws if invalid.
 * @param {string} url
 * @returns {string}
 */
function validateUrl(url) {
  if (!url || typeof url !== "string" || !url.trim()) {
    throw new Error("URL is required");
  }
  const trimmed = url.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL format");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL must use http or https");
  }
  return parsed.href;
}

/**
 * Fetches HTML from URL and extracts main article using Mozilla Readability.
 * @param {string} url - Article URL (http or https)
 * @returns {Promise<{ title: string, textContent: string, imageUrl?: string }>}
 */
export async function extractArticleFromUrl(url) {
  const href = validateUrl(url);

  let html;
  try {
    const response = await axios.get(href, {
      timeout: FETCH_TIMEOUT_MS,
      maxContentLength: MAX_CONTENT_LENGTH,
      maxRedirects: 5,
      responseType: "text",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 403,
    });
    html = response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED") {
        throw new Error("Request timed out");
      }
      if (err.response) {
        throw new Error(`Request failed with status ${err.response.status}`);
      }
      throw new Error(err.message || "Failed to fetch URL");
    }
    throw new Error("Failed to fetch URL");
  }

  if (!html || typeof html !== "string") {
    throw new Error("Empty response from URL");
  }

  const dom = new JSDOM(html, { url: href });
  const doc = dom.window.document;
  let imageUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
  if (imageUrl && !imageUrl.startsWith("http")) {
    try {
      imageUrl = new URL(imageUrl, href).href;
    } catch {
      imageUrl = null;
    }
  }

  const documentClone = doc.cloneNode(true);
  const reader = new Readability(documentClone);
  let article = reader.parse();

  let text = "";
  let title = "";

  if (article && article.textContent && article.textContent.trim().length >= MIN_ARTICLE_LENGTH) {
    text = article.textContent.trim();
    title = article.title || "";
  } else {
    const selectors = [
      "article",
      "[role='main']",
      "main",
      ".post-content",
      ".article-body",
      ".entry-content",
      ".content",
      ".post",
      "#content",
    ];
    let mainEl = null;
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length >= MIN_ARTICLE_LENGTH) {
          mainEl = el;
          break;
        }
      } catch {
        // ignore invalid selector
      }
    }
    if (mainEl && mainEl.textContent) {
      text = mainEl.textContent.trim().replace(/\s+/g, " ");
    }
    if (!text || text.length < MIN_ARTICLE_LENGTH) {
      const body = doc.body;
      if (body && body.textContent) {
        text = body.textContent.trim().replace(/\s+/g, " ");
      }
    }
    const titleEl = doc.querySelector("title");
    title = titleEl ? titleEl.textContent.trim() : "";
  }

  if (!text || text.length < MIN_ARTICLE_LENGTH) {
    throw new Error("Could not extract article content");
  }

  if (looksLikeBlockPage(title, text)) {
    throw new Error("Page returned access denied or block page");
  }

  return {
    title,
    textContent: text,
    imageUrl: imageUrl || undefined,
  };
}
