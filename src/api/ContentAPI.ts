// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import { Router } from "express";
import { request } from "https";
import { stringify as stringifyQuery } from "querystring";
import { Database } from "../database/Database";
import { getLogger } from "../util/Util";

const CACHE_TIME = 6 * 60 * 60 * 1000; // 6 hours
let CACHED_ID: string | null = null;
let LAST_CACHE_UPDATE = 0;
function getLatestVideoID(): Promise<string | null> {
  if (Date.now() - LAST_CACHE_UPDATE < CACHE_TIME) {
    return Promise.resolve(CACHED_ID);
  }

  getLogger().info("Fetching latest video ID from YouTube API");

  return new Promise((resolve, reject) => {
    const url =
      "https://youtube.googleapis.com/youtube/v3/search?" +
      stringifyQuery({
        part: "id",
        type: "video",
        channelId: "UCEVX0_x03dKzeZoUGvyEOWg",
        order: "date",
        publishedBefore: new Date(Date.now()).toISOString(),
        key: process.env.YOUTUBE_API_KEY,
      });

    request(url, res => {
      if (res.statusCode !== 200) {
        getLogger().error("Failed to fetch YouTube API");
        return reject(new Error("Failed to fetch YouTube API"));
      }

      let data = "";
      res.on("data", chunk => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (!json.items || json.items.length === 0) {
            getLogger().info("No videos found in the last 7 days");
            return resolve(null);
          }

          getLogger().info("Found video ID: " + json.items[0].id.videoId);
          const id = json.items[0].id.videoId;
          CACHED_ID = id;
          LAST_CACHE_UPDATE = Date.now();
          resolve(id);
        } catch (e) {
          getLogger().error("Failed to parse YouTube API response");
          reject(e);
        }
      });

      res.on("error", reject);
    }).end();
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getContentAPI(_database: Database): Router {
  const api = Router();

  api.get("/latest-video/redirect-embed", async (_req, res) => {
    const video = await getLatestVideoID();
    if (!video) {
      res.status(404);
    } else {
      res.redirect(302, "https://www.youtube-nocookie.com/embed/" + video);
    }
    return res.end();
  });

  api.get("/latest-video", async (_req, res) => {
    const video = await getLatestVideoID();
    res.status(200);
    res.json(video ?? null);
    return res.end();
  });

  return api;
}
