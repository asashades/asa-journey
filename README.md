# ASA Journey

Micro-journaling app with Gen-Z vibes. Capture your daily thoughts, dreams, and ideas.

## Features

- **Write** - Daily micro-journaling with bullet points, tags (#), and mentions (@)
- **Journal** - Weekly orbit view of your entries
- **Reflect** - Daily prompts and weekly summaries
- **Insights** - Analytics and statistics about your writing habits
- **Dreams** - Log your dreams and track patterns
- **Highlights** - Mark important bullets
- **Wisdom** - Capture thoughts, quotes, facts, excerpts, and lessons
- **Ideas** - Store and track your ideas
- **PWA** - Works offline and installable

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS (Railway dark theme)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **PWA**: Service Worker for offline support

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase project (with Auth, Firestore, Storage enabled)

### Installation

```bash
git clone https://github.com/asashades/asa-journey.git
cd asa-journey
npm install
cp .env.example .env.local
```

### Firebase Setup

1. Create a project at console.firebase.google.com
2. Enable Authentication (Google and Email/Password providers)
3. Create Firestore database
4. Get your config values and add them to .env.local

### Development

```bash
npm run dev
```

Open http://localhost:3000

## Gen-Z Tips

- Use #tag to create tags
- Use @name to mention people
- Press Tab to cycle bullet styles
- Add * around text to mark as highlight

## License

MIT
