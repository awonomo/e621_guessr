import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// ✅ allow requests from frontend
app.use(cors({
    origin: "http://localhost:5173"
}));

app.get("/random-post", async (req, res) => {
    try {
        const response = await fetch(
            "https://e621.net/posts.json?tags=order:random&limit=1",
            {
                headers: {
                    "User-Agent": "TagGuessGame/1.0 (by xX_Birch_the_deer_Xx"
                }
            }
        );
        const data = await response.json();
        res.json(data.posts[0]);
    } catch (err) {
        console.error("Error fetching post:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3001, () =>
    console.log("✅ Backend running on http://localhost:3001")
);
