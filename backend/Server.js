import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());

// Allow requests from frontend
app.use(cors({
  origin: "http://localhost:5173"
}));

// Map for rating options
const ratingMap = {
  safe: "rating:s",
  questionable: "rating:q",
  explicit: "rating:e",
};

// Convert selected ratings into API format
function buildRatingTags(selectedRatings) {
  const allRatings = ["safe", "questionable", "explicit"];
  const selectedSet = new Set(selectedRatings);

  // All selected or none → default, return empty
  if (selectedSet.size === allRatings.length || selectedSet.size === 0) return "";

  // One selected → include only that one
  if (selectedSet.size === 1) {
    return ratingMap[Array.from(selectedSet)[0]];
  }

  // Two selected → exclude the missing one
  if (selectedSet.size === 2) {
    const missing = allRatings.find(r => !selectedSet.has(r));
    return `-${ratingMap[missing]}`;
  }

  return "";
}

// Build full tags string for the API
function buildTagsQuery({ ratings = [], minUpvotes = 250, customCriteria = "" }) {
  const tags = [];

  const ratingTags = buildRatingTags(ratings);
  if (ratingTags) tags.push(ratingTags);

  if (minUpvotes) tags.push(`score:>=${minUpvotes}`);
  if (customCriteria) tags.push(customCriteria);

  // Fixed tags
  tags.push("order:random");
  tags.push("tagcount:>50");
  tags.push("-animated");
  tags.push("-young")

  // Log the human-readable tags
  console.log("Tags passed (pre-encoding):", tags.join(" "));

  return tags.join(" ");
}

app.get("/random-post", async (req, res) => {
  try {
    const { ratings = "", minUpvotes = 250, customCriteria = "" } = req.query;

    const ratingsArray = ratings ? ratings.split(",") : [];

    const tagsString = buildTagsQuery({ ratings: ratingsArray, minUpvotes, customCriteria });

    const endpoint = `https://e621.net/posts.json?limit=1&tags=${encodeURIComponent(tagsString)}`;

    // Log for debugging
    console.log("Full API endpoint being called (encoded):", endpoint);

    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "TagGuessGame/1.0 (by xX_Birch_the_deer_Xx)"
      }
    });

    const data = await response.json();
    res.json(data.posts[0]);
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("✅ Backend running on http://localhost:3001"));