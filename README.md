# EuroLens

**Brussels, Briefed. Understand the laws shaping Europe before they pass.**

EuroLens is a mobile-first web application that tracks upcoming votes in the European Parliament and uses AI to translate complex legislative documents into accessible, non-partisan summaries.

## Features

- **Countdown Timer**: See when the next Plenary Session is happening
- **Legislative Procedures**: Browse current EU legislative procedures
- **AI Summaries**: Get plain-language explanations of complex legislation
- **Personalized Context**: Tailor summaries based on your role (Student, Farmer, Small Business Owner, etc.) and country

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Data Source**: European Parliament Open Data API (v2)
- **AI Engine**: Vercel AI SDK with Google Gemini 2.0 Flash
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Generative AI API key ([get one here](https://aistudio.google.com/apikey))

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd eurolens
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your API key:

```
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key-here
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── summarize/
│   │       └── route.ts     # AI streaming endpoint
│   ├── globals.css          # Tailwind + EU design tokens
│   ├── layout.tsx           # Root layout with Inter font
│   └── page.tsx             # Main dashboard
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── context-selector.tsx # Persona/country dropdowns
│   ├── countdown-timer.tsx  # Session countdown
│   ├── dashboard.tsx        # Main dashboard wrapper
│   ├── dossier-card.tsx     # Legislative item card
│   ├── dossier-skeleton.tsx # Loading state
│   └── procedures-list.tsx  # Procedures grid
├── lib/
│   ├── europarl.ts          # EU Parliament API client
│   └── utils.ts             # shadcn utility
└── types/
    └── europarl.ts          # TypeScript interfaces
```

## Design System

### Colors

- **EU Blue**: #003399 (Primary)
- **Paper White**: #F5F5F5 (Background)
- High contrast design for accessibility

### Typography

- **Inter**: Primary UI font
- Large, readable text sizes

## Accessibility

EuroLens follows WCAG 2.1 AA guidelines:

- All interactive elements are keyboard focusable
- ARIA labels for AI-generated content
- Screen reader compatible
- Respects `prefers-reduced-motion`
- High contrast color palette

## Data Sources

Data is fetched from the [European Parliament Open Data Portal](https://data.europarl.europa.eu).

**Note**: AI summaries are generated for educational purposes and should not be considered official interpretations of EU legislation.

## License

MIT
