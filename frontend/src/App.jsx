import React, { useState } from "react";
import GameSetup from "./GameSetup";
import GameScreen from "./GameScreen";

export default function App() {
  const [gameConfig, setGameConfig] = useState(null);

  const handleStart = (config) => {
    setGameConfig(config); // includes first post in config.post
  };

  const handleReset = () => {
    setGameConfig(null); // go back to setup
  };

  return (
    <div>
      {!gameConfig ? (
        <GameSetup onStart={handleStart} />
      ) : (
        <GameScreen
          config={gameConfig} // contains post and all settings
          onReset={handleReset}
        />
      )}
    </div>
  );
}
