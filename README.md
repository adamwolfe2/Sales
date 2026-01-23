# VendingPreneurs Sales Command Center

Enterprise-grade sales coaching and objection handling tool for the VendingPreneurs sales team.

## Overview

A real-time sales assistant built from comprehensive analysis of 1,491+ sales calls, featuring:

- **Objection Handler**: Instant access to proven scripts with win rates
- **Playbook Library**: Complete frameworks from Eric, Matt, and Scott
- **Rep Dashboard**: Performance tracking and coaching recommendations
- **Testimonial Library**: Searchable success stories for social proof
- **Call Analyzer**: Real-time pattern detection and recommendations

## Quick Start

1. Serve the files with any HTTP server:
   ```bash
   # Using Python
   python3 -m http.server 8000

   # Using Node.js
   npx serve

   # Using PHP
   php -S localhost:8000
   ```

2. Open `http://localhost:8000` in your browser

## Features

### Objection Handler
- 10 primary objection categories
- Win rates from actual call data
- Multiple response frameworks (Matt, Scott, Eric)
- Copy-to-clipboard scripts
- Difficulty indicators (favorable/moderate/challenging)

### Playbook Library
- Eric's complete WFS (Word-For-Script) playbook
- Matt Chubb's objection handling philosophy
- Scott Seymour's practical approach
- Quick reference scripts by situation

### Rep Performance Dashboard
- Individual scorecards with win rates
- Gap analysis vs team averages
- Shadowing pair recommendations
- Critical gap alerts

### Call Analyzer
- Enter objections to get real-time analysis
- Three-objection threshold warning (31% win rate)
- Dangerous combination detection
- Re-qualification script recommendations

### Testimonial Library
- Full success stories with metrics
- Filtered by objection type
- Revenue proof points
- Copy-to-clipboard quotes

## Data Sources

All data is derived from:
- 1,491 analyzed sales conversations
- 30+ call samples across all reps
- 100+ unique objections identified
- 8 primary objection categories

## Key Metrics

| Metric | Value |
|--------|-------|
| Calls Analyzed | 1,491 |
| Overall Team Win Rate | 56% |
| Most Challenging Objection | "No capital" (42% win rate) |
| Easiest to Overcome | "How does financing work?" (87% win rate) |
| Danger Zone | Price + Authority combo (18% win rate) |

## Keyboard Shortcuts

- `/` - Focus search
- `Esc` - Close modal / Clear search

## File Structure

```
/
├── index.html           # Main application
├── src/
│   └── app.js          # Application logic
├── styles/
│   └── main.css        # Styling
└── data/
    ├── objections.json  # Objection database
    ├── playbooks.json   # Sales frameworks
    ├── testimonials.json # Success stories
    └── reps.json        # Rep performance data
```

## Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge) with ES6+ support.

## Development

This is a static web application with no build step required. Edit files directly and refresh to see changes.
