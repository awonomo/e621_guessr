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
    const apiUrl = `https://e621.net/posts.json?limit=5&tags=order:random ${tags}`;
    console.log("Final API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: { "User-Agent": "e6 Tag Challenge/1.0 (by xX_Birch_the_deer_Xx" }
    });
    const data = await response.json();

    // Log info for all posts returned
    if (data.posts && data.posts.length > 0) {
      data.posts.forEach((post, idx) => {
        const postUrl = `https://e621.net/posts/${post.id}`;
        console.log(`Received post #${idx + 1}: ${postUrl}`);
      });
    } else {
      console.log("⚠️ No posts returned for these tags.");
    }

    res.json({ posts: data.posts });
  } catch (err) {
    console.error("Error in /pull-posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});