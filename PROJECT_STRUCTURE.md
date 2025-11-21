# Project Structure

## Folder Organization

```
├── app/
│   ├── layout.tsx          # Root layout with SEO metadata
│   ├── page.tsx            # Home page
│   ├── about/
│   │   └── page.tsx        # About page
│   └── globals.css         # Global styles
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx      # Navigation header
│   │   └── Footer.tsx      # Footer component
│   │
│   ├── sections/           # Home page sections
│   │   ├── Hero.tsx        # Hero section
│   │   ├── Stats.tsx       # Statistics section
│   │   ├── Experience.tsx  # Experience showcase
│   │   ├── KeyFeatures.tsx # Features grid
│   │   └── VideoFeedback.tsx # Video feedback section
│   │
│   ├── about/              # About page sections
│   │   ├── AboutHero.tsx   # About hero section
│   │   ├── HowItWorks.tsx  # How it works steps
│   │   ├── Vision.tsx      # Vision statement
│   │   └── CallToAction.tsx # CTA section
│   │
│   └── ui/
│       └── Button.tsx      # Reusable button component
│
├── tailwind.config.ts      # Tailwind CSS v3.4 configuration
├── postcss.config.mjs      # PostCSS configuration
└── public/                 # Static assets
```

## Pages

- **Home (/)** - Landing page with hero, stats, features
- **About (/about)** - Mission, vision, how it works

## SEO Features

- Comprehensive metadata in layout.tsx and page.tsx
- OpenGraph tags for social sharing
- Twitter card support
- Semantic HTML structure
- Optimized for search engines
- Page-specific metadata

## Design System

- Dark theme (#0a1628, #0f1f3a, #1a2942)
- Emerald accent color (#10b981)
- Tailwind CSS v3.4 for styling
- Responsive design (mobile-first)
- Smooth animations and transitions

## Running the App

```bash
npm run dev
```

Visit http://localhost:3000
