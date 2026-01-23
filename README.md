# VendingPreneurs Sales Command Center

Enterprise-grade sales coaching and objection handling tool for the VendingPreneurs sales team.

## Two Applications

### 1. Web Dashboard (Static)
Browser-based reference tool for objections, playbooks, rep performance, and testimonials.

### 2. Real-Time Overlay (Electron)
Live AI coaching overlay that listens to sales calls and provides proactive suggestions using Gemini.

---

## Real-Time Overlay (The Main Product)

An always-on-top desktop overlay that:
- Captures audio from your sales calls via microphone
- Streams to Gemini Live API for real-time transcription
- Detects objections as they happen
- Shows instant script suggestions
- Alerts on dangerous patterns (3+ objections, Price+Authority combo)

### Quick Start - Real-Time App

```bash
cd realtime
npm install
npm start
```

### Requirements
- Node.js 18+
- Gemini API key (get from Google AI Studio)
- Microphone access

### How It Works

1. **Connect**: Enter your Gemini API key and click Connect
2. **Listen**: The app captures your microphone audio
3. **Detect**: AI identifies objections in real-time
4. **Coach**: Get instant script suggestions overlaid on your screen

### Features

- **Always-on-top overlay** - Stays visible during calls
- **Real-time transcription** - See what's being said
- **Objection detection** - Automatic pattern matching
- **Instant scripts** - Copy-paste ready responses
- **Danger alerts** - Warns on 3+ objections or bad combos
- **Quick scripts** - One-click access to key responses

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+V` | Toggle visibility |
| `Ctrl+Shift+T` | Toggle always-on-top |

### System Prompt

The AI is trained on:
- Matt Chubb's objection playbook
- Scott Seymour's practical approach
- Eric's WFS framework
- Data from 1,491 analyzed calls

---

## Web Dashboard

### Quick Start

```bash
# Serve the files
python3 -m http.server 8000

# Open browser
open http://localhost:8000
```

### Features

| Feature | Description |
|---------|-------------|
| Objection Handler | 10 categories with win rates and scripts |
| Playbook Library | Eric, Matt, Scott frameworks |
| Rep Dashboard | Performance tracking and coaching |
| Testimonial Library | Success stories by objection type |
| Call Analyzer | Pattern detection and recommendations |

---

## Data Overview

| Metric | Value |
|--------|-------|
| Calls Analyzed | 1,491 |
| Objections Indexed | 100+ |
| Team Win Rate | 56% |
| Hardest Objection | "No capital" (42%) |
| Danger Combo | Price + Authority (18%) |

---

## File Structure

```
/
├── index.html              # Web dashboard
├── src/app.js              # Dashboard logic
├── styles/main.css         # Dashboard styling
├── data/
│   ├── objections.json     # Objection database
│   ├── playbooks.json      # Sales frameworks
│   ├── testimonials.json   # Success stories
│   └── reps.json           # Rep performance
└── realtime/
    ├── package.json        # Electron app config
    ├── forge.config.js     # Build config
    └── src/
        ├── main.js         # Electron main process
        ├── preload.js      # IPC bridge
        ├── index.html      # Overlay UI
        └── utils/
            ├── gemini.js   # Gemini Live API
            └── prompts.js  # System prompts
```

---

## Key Scripts (Quick Reference)

### Capital Objection
> "Is it a case you've got the full $6,000 that's just a little bit difficult or scary to invest? Or do you have some of it when you look at breaking it up? Or you've got none of it at all, and we need to go to the bank?"

### Spouse Objection
> "What does your spouse do for work? When she's at work making decisions, she doesn't rely on you to make those decisions for her, right? Why would it be fair to put the decision for YOUR future onto her?"

### Think About It
> "I'll call you in a week? No, you won't. You'll no-show me. Come on now, man. What's really going on?"

### 3+ Objections (Re-qualify)
> "On a scale of 1-10, how serious are you about starting a vending business in the next 90 days?"

---

## Building for Distribution

```bash
cd realtime
npm run make
```

This creates distributable packages for Windows, macOS, and Linux.
