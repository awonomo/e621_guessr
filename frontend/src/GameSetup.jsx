import React, { useState } from "react";

const ratingMap = {
  safe: "rating:s",
  questionable: "rating:q",
  explicit: "rating:e",
};

export default function GameSetup({ onStart }) {
  const [timeLimit, setTimeLimit] = useState(120); // default 2 minutes
  const [gameMode, setGameMode] = useState("tagGuessing"); // only option for now
  const [ratings, setRatings] = useState({
    safe: true,
    questionable: false,
    explicit: false,
  });
  const [minUpvotes, setMinUpvotes] = useState(250); // default 250
  const [customCriteria, setCustomCriteria] = useState("");

  const handleRatingChange = (rating) => {
    setRatings((prev) => ({ ...prev, [rating]: !prev[rating] }));
  };

  const buildRatingParam = () => {
    const selected = Object.keys(ratings).filter((r) => ratings[r]);
    const allRatings = Object.keys(ratings);

    if (selected.length === 3) return ""; // all selected, default
    if (selected.length === 1) return ratingMap[selected[0]]; // only one
    if (selected.length === 2) {
      const missing = allRatings.find((r) => !ratings[r]);
      return `-${ratingMap[missing]}`; // exclude the missing one
    }
    return ""; // none selected, fallback to default
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  // Get array of selected rating names
  const selectedRatings = Object.keys(ratings).filter((r) => ratings[r]);

  // Build query params
  const params = new URLSearchParams({
    ratings: selectedRatings.join(","), // e.g. "safe,explicit"
    minUpvotes,
    customCriteria,
  }).toString();

  try {
    const response = await fetch(`http://localhost:3001/random-post?${params}`);
    const data = await response.json();

    onStart({
      timeLimit,
      gameMode,
      ratings: selectedRatings,
      minUpvotes,
      customCriteria,
      post: data, // include API response
    });
  } catch (err) {
    console.error("Error fetching post:", err);
  }
};

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {/* Time Limit */}
      <div>
        <label className="block mb-1">Time Limit (seconds)</label>
        <input
          type="number"
          min="30"
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value))}
          className="border rounded p-2 w-full"
        />
      </div>

      {/* Game Mode */}
      <div>
        <label className="block mb-1">Game Mode</label>
        <select
          value={gameMode}
          onChange={(e) => setGameMode(e.target.value)}
          className="border rounded p-2 w-full"
        >
          <option value="tagGuessing">Tag Guessing</option>
        </select>
      </div>

      {/* Rating */}
      <div>
        <label className="block mb-1">Rating</label>
        <div className="flex gap-4">
          {["safe", "questionable", "explicit"].map((rating) => (
            <label key={rating} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={ratings[rating]}
                onChange={() => handleRatingChange(rating)}
              />
              {rating.charAt(0).toUpperCase() + rating.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Minimum Upvotes */}
      <div>
        <label className="block mb-1">Minimum Upvotes</label>
        <input
          type="number"
          value={minUpvotes}
          min="0"
          onChange={(e) => setMinUpvotes(Number(e.target.value))}
          className="border rounded p-2 w-full"
        />
      </div>

      {/* Custom Criteria */}
      <div>
        <label className="block mb-1">Custom Criteria</label>
        <input
          type="text"
          value={customCriteria}
          onChange={(e) => setCustomCriteria(e.target.value)}
          className="border rounded p-2 w-full"
          placeholder=""
        />
      </div>

      {/* Start Button */}
      <button
        type="submit"
        className="bg-blue-500 text-white rounded px-4 py-2"
      >
        Start Game
      </button>
    </form>
  );
}