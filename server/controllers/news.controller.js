import News from "../models/News.js";
import { summarizeText } from "../services/ai.service.js";
import { extractArticleFromUrl } from "../services/scraper.service.js";

export const createNews = async (req, res) => {
  try {
    const { content: rawContent, sourceUrl, imageUrl: bodyImageUrl } = req.body;

    const hasContent = rawContent && typeof rawContent === "string" && rawContent.trim().length > 0;
    const hasSourceUrl = sourceUrl && typeof sourceUrl === "string" && sourceUrl.trim().length > 0;

    let content;
    let finalSourceUrl = hasSourceUrl ? sourceUrl.trim() : undefined;
    let imageUrl = bodyImageUrl && typeof bodyImageUrl === "string" && bodyImageUrl.trim().length > 0 ? bodyImageUrl.trim() : undefined;

    if (hasContent) {
      content = rawContent.trim();
    } else if (hasSourceUrl) {
      try {
        const extracted = await extractArticleFromUrl(finalSourceUrl);
        content = extracted.textContent;
        if (extracted.imageUrl) imageUrl = extracted.imageUrl;
      } catch (scraperError) {
        console.error("Scraper error for URL:", finalSourceUrl, scraperError.message);
        const msg = scraperError.message || "Failed to fetch or extract article from URL";
        const isBadRequest = /invalid|required|format|http|https/i.test(msg);
        return res
          .status(isBadRequest ? 400 : 502)
          .json({ message: msg });
      }
    } else {
      return res.status(400).json({ message: "Content or sourceUrl is required" });
    }

    if (finalSourceUrl) {
      const existing = await News.findOne({ sourceUrl: finalSourceUrl });
      if (existing) {
        return res.status(409).json({ message: "Article from this URL already exists" });
      }
    }

    let aiResult;
    try {
      aiResult = await summarizeText(content);
    } catch (aiError) {
      return res.status(503).json({ message: "AI Service unavailable: " + aiError.message });
    }

    const sourceType = hasContent ? "manual" : "url";
    const news = await News.create({
      title: aiResult.title,
      content,
      summary: aiResult.summary,
      whyItMatters: aiResult.whyItMatters,
      sourceUrl: finalSourceUrl,
      source: sourceType,
      sourceName: null,
      imageUrl: imageUrl || undefined,
      createdBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      message: "News created successfully",
      news: {
        id: news._id,
        title: news.title,
        summary: news.summary,
        whyItMatters: news.whyItMatters,
        sourceUrl: news.sourceUrl,
        source: news.source,
        sourceName: news.sourceName,
        imageUrl: news.imageUrl,
        createdBy: news.createdBy,
        createdAt: news.createdAt
      }
    });
  } catch (error) {
    console.error("Create News Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getNews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const sourceFilter = req.query.source; // optional: youtube | rss | manual | url
    const skip = (page - 1) * limit;

    const filter = {};
    if (sourceFilter && ["youtube", "rss", "manual", "url"].includes(sourceFilter)) {
      filter.source = sourceFilter;
    }

    const news = await News.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email");

    const total = await News.countDocuments(filter);

    res.json({
      message: "News fetched successfully",
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      count: news.length,
      news
    });
  } catch (error) {
    console.error("Get News Error:", error);
    res.status(500).json({ message: "Failed to fetch news" });
  }
};
