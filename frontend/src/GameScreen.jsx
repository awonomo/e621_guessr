import React, { useState, useEffect, useRef } from "react";

function GameScreen({ config, onReset }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [currentPost, setCurrentPost] = useState(config.post);
  const [guess, setGuess] = useState("");
  const [correctGuesses, setCorrectGuesses] = useState({});

  // autofocus ref
  const guessInputRef = useRef(null);

  useEffect(() => {
    if (guessInputRef.current) guessInputRef.current.focus();
  }, []); // focus on mount

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!currentPost) return <p>Loading…</p>;

  // Tag color mapping (text color)
  const tagColors = {
    general: "#b4c7d9",
    artist: "#f2ac08",
    contributor: "silver",
    copyright: "#d0d",
    character: "#0a0",
    species: "#ed5d1f",
    meta: "#fff",
    lore: "#282",
    invalid: "#ff3d3d",
  };

  // Handle input change (replace spaces with underscores — handles typing and pasting)
  const handleInputChange = (e) => {
    // replace all whitespace with underscores (keeps underscores if user types them)
    setGuess(e.target.value.replace(/\s+/g, "_"));
  };

  // Handle Enter key to submit
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitGuess();
    }
  };

  // Handle guess submission
  const handleSubmitGuess = () => {
    const normalizedGuess = guess.trim().toLowerCase();
    if (!normalizedGuess) return;

    let found = false;
    const updatedGuesses = { ...correctGuesses };

    // Iterate categories and tags
    Object.entries(currentPost.tags).forEach(([category, tagList]) => {
      tagList.forEach((tag) => {
        if (tag.toLowerCase() === normalizedGuess) {
          found = true;
          if (!updatedGuesses[category]) updatedGuesses[category] = [];
          if (!updatedGuesses[category].includes(normalizedGuess)) {
            updatedGuesses[category].push(normalizedGuess);
          }
        }
      });
    });

    if (found) {
      setScore(prev => prev + 125);
      setCorrectGuesses(updatedGuesses);
      setGuess(""); // only clear when correct
      // keep focus so player can type next guess quickly
      if (guessInputRef.current) guessInputRef.current.focus();
    } else {
      // keep the incorrect guess in the box (as requested)
      // optionally you could provide feedback here (shake, red border, etc.)
    }
  };

  const totalTags = Object.keys(currentPost.tags).reduce((sum, k) => sum + currentPost.tags[k].length, 0);

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "rgb(2, 15, 35)",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "stretch",
        padding: "20px",
        boxSizing: "border-box",
        paddingBottom: "100px", // leave room for fixed guess bar
      }}
    >
      <h1 style={{ textAlign: "left"}}>e6_tag_challenge</h1>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "flex-start",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {/* Left Column */}
        <div
          style={{
            marginRight: "20px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
            backgroundColor: "rgb(41, 38, 61)",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            flex: "0 0 20%",
          }}
        >
            {/* SCOREBOX */}
            <div>
          <span style={{
            fontSize: "3rem",
            fontWeight: "bold",
          }}> 
            {score}</span>
          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              backgroundColor: "rgb(1,73,149)",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {/* TIMER */}
            <span style={{
                fontSize: "2rem",
                }}>{formatTime(timeLeft)}</span>
          </div>


        <div style={{ marginTop: 12, textAlign: "right" }}>
            <strong>Total Tags:</strong> {totalTags}
          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              backgroundColor: "rgb(1,46,87)",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {/* Correct guesses by category (text colored) */}
            <div style={{ marginTop: "1rem" }}>
              Tags:
              {Object.entries(correctGuesses).length === 0 && <div style={{ marginTop: 8 }}>None yet</div>}
              {Object.entries(correctGuesses).map(([category, guesses]) => (
                <div key={category} style={{ marginTop: "0.5rem" }}>
                  <span style={{ fontWeight: "bold", textTransform: "capitalize" }}>{category}:</span>{" "}
                  {guesses.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        color: tagColors[category] || tagColors.invalid,
                        marginRight: "6px",
                        fontSize: "0.9rem",
                        display: "inline-block",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onReset}
            style={{
              marginTop: "20px",
              padding: "10px",
              border: "none",
              borderRadius: "5px",
              backgroundColor: "rgb(187, 0, 0)",
              color: "white",
              cursor: "pointer",
            }}
          >
            End Game
          </button>
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, maxWidth: "600px", margin: "0 auto" }}>
          {/* Post display */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{ textAlign: "center" }}>
                <img
                  src={currentPost.sample?.url || currentPost.file.url}
                  alt={`Post ${currentPost.id}`}
                  style={{ maxWidth: "100%", borderRadius: "8px", marginBottom: "1rem" }}
                />
                {/* <h2>Post #{currentPost.id}</h2> */}
              </div>
            </div>
          </div>

           {/* <pre
              style={{
                minWidth: "200px",
                textAlign: "left",
                backgroundColor: "rgb(1,73,149)",
                padding: "1rem",
                borderRadius: "8px",
                overflowX: "auto",
                alignSelf: "flex-start",
              }}
            >
              {JSON.stringify(currentPost.tags, null, 2)}
            </pre> */}
        </div>
      </div>

      {/* Floating guess bar (fixed to bottom) */}
      <div
        style={{
          position: "fixed",
          bottom: 12,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          pointerEvents: "auto",
          zIndex: 1000,
        }}
      >
        <div style={{ width: "min(900px, 95%)", display: "flex", gap: 8 }}>
          <input
            ref={guessInputRef}
            type="text"
            value={guess}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter guess (spaces become underscores)..."
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #555",
              background: "#fff",
              color: "#000",
              fontSize: "16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={handleSubmitGuess}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "rgb(252,179,40)",
              color: "#000",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameScreen;