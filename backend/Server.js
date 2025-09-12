// server.js (excerpt)
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3001;

// Example endpoint
app.get("/pull-posts", async (req, res) => {
  try {
    const { tags } = req.query;

    // Log the raw tags received from the frontend
    console.log("========================================");
    console.log("API Request: /pull-posts");
    console.log("Raw tags (before encoding):", tags);

    // Build e621 API URL
    const apiUrl = `https://e621.net/posts.json?limit=1&tags=order:random ${tags}`;
    console.log("Final API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: { "User-Agent": "e6 Tag Challenge/1.0 (by xX_Birch_the_deer_Xx" }
    });
    const data = await response.json();

    // Log post info (if any)
    if (data.posts && data.posts.length > 0) {
      const postId = data.posts[0].id;
      const postUrl = `https://e621.net/posts/${postId}`;
      console.log(`Received post: ${postUrl}`);
    } else {
      console.log("⚠️ No posts returned for these tags.");
    }

    res.json(data.posts[0] || {});
  } catch (err) {
    console.error("Error in /pull-posts:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});