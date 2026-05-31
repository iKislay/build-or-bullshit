# Build or Bullsh*t - V1 Internal Tool

A real-time multiplayer web application for running a live YouTube show where a host and panelists review startup websites.

## Features

✅ **Authentication System** - Password-based login for host and panelists
✅ **Room System** - Host creates rooms with unique codes, panelists join
✅ **CSV Upload** - Upload and randomize project submissions
✅ **7-Stage Review Flow** - Complete review process from guess to tier placement
✅ **Real-time Voting** - Hidden votes revealed when all panelists submit
✅ **Live Scoreboard** - Track points in real-time
✅ **Tier Board** - Separate display page showing S/A/B/C/D/F tiers
✅ **Neo Brutalism Design** - Bold, high-contrast livestream-ready UI

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **TailwindCSS** (Neo Brutalism styling)
- **Shadcn UI**
- **Socket.io** (Real-time sync)
- **Zustand** (State management)
- **PapaParse** (CSV parsing)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Passwords

Edit `.env.local` and set passwords:

```env
HOST_PASSWORD=your_host_password
PANEL_1_PASSWORD=panelist1_password
PANEL_2_PASSWORD=panelist2_password
PANEL_3_PASSWORD=panelist3_password
PANEL_4_PASSWORD=panelist4_password
```

### 3. Start Development Server

```bash
npm run dev
```

Server runs on http://localhost:3000

### 4. Production Build

```bash
npm run build
npm start
```

## How to Use

### Host Flow

1. **Login** - Go to http://localhost:3000 and enter host password
2. **Create Room** - Enter a room name (e.g., "Friday Roast #1")
3. **Share Code** - Give the generated room code to panelists
4. **Upload CSV** - Upload your projects CSV file (see format below)
5. **Review Projects** - Control the flow through all 7 stages
6. **Award Points** - Click panelist names to award points

### Panelist Flow

1. **Login** - Go to http://localhost:3000 and enter panelist password
2. **Join Room** - Enter the room code from the host
3. **Vote** - Submit scores during voting stages
4. **View Results** - See revealed votes and scoreboard

### Tier Board

Open http://localhost:3000/tierboard in a separate window/monitor to display the live tier board during the show.

## CSV Format

Your CSV must have these exact column names:

```csv
Submission ID,Submitted At,Your project link,What does your project do? (In short),At what stage your product is?,Have you launched on forg.to?,One thing you're struggling with,Dummy credentials
```

**Stage Options:**
- 0 users, 100% confidence
- 100 users, 0% retention
- Traffic comes, money doesn't
- Finding product-market fit 🔍
- Nobody understands the value
- Everything. Please send help 🚨

A sample CSV file is included: `sample-projects.csv`

## Review Stages

### Stage 1: Guess What It Does
- Display URL only
- Panelists verbally guess the product
- Host advances when ready

### Stage 2: Reveal
- Show project description
- Host awards +5 points for correct guesses

### Stage 3: Open Website
- Host clicks to open project in new tab
- Auto-advances to Stage 4

### Stage 4: First Impression
- Panelists rate 1-10
- Votes hidden until all submit
- Results revealed with average

### Stage 5: Landing Page Review
- Three categories: Design, Clarity, Value
- Each category reveals independently
- All must complete before advancing

### Stage 6: Product Review
- Panelists explore the actual product
- Rate "Potential" 1-10
- Votes revealed when all submit

### Stage 7: Guess Product Stage
- Panelists guess from 6 options
- Reveal all guesses + correct answer
- Host awards +25 points to correct guesses

## Scoring System

- **+5 points** - Correct description guess (Stage 2)
- **+25 points** - Correct stage guess (Stage 7)

## Tier Calculation

Final score = Average of (First Impression + Design + Clarity + Value + Potential)

**Tier Mapping:**
- **S Tier**: 9.0 - 10.0
- **A Tier**: 8.0 - 8.99
- **B Tier**: 7.0 - 7.99
- **C Tier**: 6.0 - 6.99
- **D Tier**: 5.0 - 5.99
- **F Tier**: Below 5.0

## Routes

- `/` - Login page
- `/host` - Host dashboard
- `/panel` - Panelist dashboard
- `/tierboard` - Tier board display (for second monitor)

## Architecture

### Server
- Custom Express + Socket.io server (`server.js`)
- In-memory room state (no database)
- Real-time event broadcasting

### Client
- Zustand stores for state management
- Socket.io client for real-time sync
- Server is source of truth

### State Management
- `useAuthStore` - Session management
- `useRoomStore` - Room state
- `useProjectStore` - Current project
- `useVoteStore` - Voting state
- `useScoreStore` - Scoreboard

## Important Notes

⚠️ **No Persistence** - All state lives in memory. If the server restarts, everything resets. This is acceptable for V1.

⚠️ **No Database** - CSV is uploaded fresh for each show.

⚠️ **Light Mode Only** - Designed for livestream visibility.

⚠️ **Internal Tool** - Not a public SaaS, optimized for controlled livestream environment.

## Troubleshooting

### Port Already in Use
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill
```

### Socket Connection Issues
- Check that server is running on port 3000
- Verify no firewall blocking WebSocket connections
- Check browser console for connection errors

### CSV Upload Fails
- Verify all required columns are present
- Check for proper CSV formatting
- Ensure file encoding is UTF-8

## Future Enhancements (V2+)

- Database persistence
- Multiple simultaneous rooms
- Replay/archive functionality
- Advanced analytics
- Custom scoring rules
- Mobile-optimized panelist view

## License

Internal tool - All rights reserved

---

Built with ❤️ for Build or Bullsh*t livestream
