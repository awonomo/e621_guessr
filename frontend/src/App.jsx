import React, { useState, useEffect } from "react";
import RandomPost from "./RandomPost";

function App() {
    const [score, setScore] = useState(0); // State to manage the score
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

    // Mock tags data, replace with actual data source
    const tags = {
        general: ["This is where tags will go for testing purposes."]
    };

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    return (
        <div style={{ backgroundColor: "rgb(2, 15, 35)", color: "white", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "stretch", padding: "20px", boxSizing: "border-box" }}>
            <h1 style={{ textAlign: "center" }}>E6 Tag Challenge</h1>

            <div style={{ display: "flex", flex: 1, alignItems: "flex-start", justifyContent: "space-between", width: "100%" }}>
                {/* Score Box */}
                <div style={{
                    marginRight: "20px",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    backgroundColor: "rgb(252,179,40)",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    flex: "0 0 20%"
                }}>
                    <strong>Score:</strong> {score}

                    {/* Timer Box */}
                    <div style={{
                        marginTop: "10px",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                        backgroundColor: "rgb(1,73,149)",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        color: "white",
                        fontWeight: "bold"
                    }}>
                        Time Left: {formatTime(timeLeft)}
                    </div>

                    {/* Correct Guesses Box */}
                    <div style={{
                        marginTop: "10px",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                        backgroundColor: "rgb(1,46,87)",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        maxHeight: "200px",
                        overflowY: "auto"
                    }}>
                        <strong>Correct Guesses:</strong>
                        <ul>
                            {/* Replace with dynamic data */}
                            <li>Example Guess 1</li>
                            <li>Example Guess 2</li>
                        </ul>
                    </div>
                </div>

                {/* Random Post */}
                <div style={{ flex: 1, maxWidth: "600px", margin: "0 auto" }}>
                    <RandomPost />

                    {/* Text Input Box */}
                    <div style={{ marginTop: "20px", display: "flex", alignItems: "center" }}>
                        <input
                            type="text"
                            placeholder="Enter your guess here"
                            style={{
                                flex: 1,
                                padding: "10px",
                                border: "1px solid #ccc",
                                borderRadius: "5px",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                            }}
                        />
                        <button
                            style={{
                                marginLeft: "10px",
                                padding: "10px 20px",
                                border: "none",
                                borderRadius: "5px",
                                backgroundColor: "rgb(252,179,40)",
                                color: "white",
                                cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                            }}
                        >
                            Submit
                        </button>
                        <div>
                            {/* Total Tags Box */}

                            <div style={{
                                marginLeft: "10px",
                                padding: "10px",
                                border: "1px solid #ccc",
                                borderRadius: "5px",
                                backgroundColor: "rgb(187, 187, 187)",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                            }}>
                                <strong>Total Tags:</strong> {tags.general.length}
                            </div>

                        </div>

                    </div>
                </div>

            </div>

        </div>
    );
}

export default App;
