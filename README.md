# e621_guessr

[![Svelte](https://img.shields.io/badge/-Svelte_5-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/-Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Plotly](https://img.shields.io/badge/-Plotly-3F4F75?style=for-the-badge&logo=plotly&logoColor=white)](https://plotly.com/javascript/)
[![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Zod](https://img.shields.io/badge/-Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)


## OwO what's this?

e621_guessr is a game which tests your knowledge of furry art tags. 
high scores are awarded to the most interesting tags.

if you don't know what e621 is.. forget you ever saw this.

** you must be 18 years or older to play ! **

## installation

### prerequisites
- node.js (v18 or newer recommended)
- npm (comes with node.js)

### install node.js and npm (macOS with homebrew)
- open a terminal
- install [homebrew](https://brew.sh) if you don't have it:
  ```
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```
- install node (includes npm):
  ```
  brew install node
  ```
- check installation:
  ```
  node -v
  npm -v
  ```
  both should print a version number

### install node.js and npm (other OS)
- go to [nodejs.org](https://nodejs.org)
- download the "LTS" version for your OS
- run the installer
- open a terminal and check:
  ```
  node -v
  npm -v
  ```
  both should print a version number

### clone the repo
```
git clone https://github.com/awonomo/e621_guessr.git
cd e621_guessr
```

### install dependencies
```
npm install
cd backend
npm install
```

### setup the backend (first time only)
```bash
cd backend
# Complete setup (database + tag data)
npm run setup

# Or if you prefer to do it step by step:
npm run db:init      # Initialize database schema
npm run tags:refresh # Download tag data from e621
```

## running locally

### start the backend (api server)
```
cd backend
npm run dev
```

### start the frontend (vite dev server)
```
cd ..
npm run dev
```

- open your browser to [http://localhost:5173](http://localhost:5173)
- the backend runs on [http://localhost:3001](http://localhost:3001)


## scoring system overview

![Scoring System Visualization](img/e621_guessr_scoring_10.10.jpg)

tags are scored based on rarity sweet spots:
- tag categories have their own minimum scores and weighted curves
- contextual multiplier system aims to dampen and boost general tags based on patterns (tags pertaining to color for instance)

## roadmap
- create more game modes
- add leaderboard
- host it publicly
- settings
- statistics screen
- add more tags and tag contexts to the scoring multipliers
- UI sounds
- UI effects for high scoring tags
- UI response to incorrect and/or repeated guesses
- add a share feature to game summary
- local multiplayer with kahoot/jackbox style audience input

---