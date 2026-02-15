import axios from "axios";
import { YoutubeTranscript } from "youtube-transcript";
import News from "../models/News.js";
import { summarizeText } from "./ai.service.js";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export const fetchLatestVideos = async (channelId) => {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not defined");
  }

  try {
    // 1. Fetch latest 5 videos from YouTube API
    const response = await axios.get(YOUTUBE_SEARCH_URL, {
      params: {
        key: process.env.YOUTUBE_API_KEY,
        channelId: channelId,
        part: "snippet",
        order: "date",
        maxResults: 10,
        type: "video",
      },
    });

    if (!response.data.items) {
      console.log("YouTube API returned no items.");
      return 0;
    }

    const videos = response.data.items;
    let createdCount = 0;

    console.log(`Found ${videos.length} videos for channel ${channelId}`);

    for (const video of videos) {
      const videoId = video.id.videoId;
      const title = video.snippet.title;
      const description = video.snippet.description;
      const sourceUrl = `https://youtube.com/watch?v=${videoId}`;
      const thumb = video.snippet.thumbnails;
      const imageUrl = thumb?.high?.url || thumb?.medium?.url || thumb?.default?.url || undefined;

      // 2. Check for duplicates
      const existingNews = await News.findOne({ sourceUrl });
      if (existingNews) {
        console.log(`Skipping duplicate video: ${title} (${videoId})`);
        continue;
      }

      try {
        console.log(`Processing video: ${title} (${videoId})`);

        let transcriptText = "";

        // 3. Try to fetch transcript
        try {
          const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
          if (transcriptItems && transcriptItems.length > 0) {
             transcriptText = transcriptItems.map(item => item.text).join(" ");
          }
        } catch (transcriptError) {
          console.log(`No transcript found for video: ${videoId}. Falling back to description.`);
        }

        // 4. Fallback to description if transcript is empty
        if (!transcriptText || transcriptText.trim().length === 0) {
           if (description && description.trim().length > 0) {
             console.log(`Using description for summary: ${videoId}`);
             transcriptText = description;
           } else {
             console.log(`No transcript and no description for video: ${videoId}. Skipping.`);
             continue;
           }
        }

        // 5. Summarize transcript (or description)
        console.log(`Summarizing text for: ${videoId}...`);
        const summaryResult = await summarizeText(transcriptText);

        // 6. Save to MongoDB
        await News.create({
          title: summaryResult.title,
          content: transcriptText,
          summary: summaryResult.summary,
          whyItMatters: summaryResult.whyItMatters,
          sourceUrl,
          source: "youtube",
          sourceName: channelId,
          imageUrl,
          createdBy: null
        });

        createdCount++;
        console.log(`Successfully saved news for video: ${title}`);

      } catch (err) {
        console.error(`Error processing video ${videoId}:`, err.message);
        // Continue to next video
      }
    }

    return createdCount;

  } catch (error) {
    console.error("YouTube Service Error:", error.message);
    if (error.response) {
       console.error("YouTube API Error Data:", error.response.data);
    }
    throw new Error("Failed to fetch YouTube videos");
  }
};
