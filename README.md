# 🏠 TauschMatch

> Find real, two-way apartment swaps in Berlin. Minimal, efficient, and AI-powered.

TauschMatch is a modern web application that helps people find apartment exchange opportunities in Berlin using intelligent AI-powered matching. Instead of sifting through hundreds of listings manually, our system analyzes your preferences and apartment details to find truly compatible swap partners.

## 🌟 Highlights

- **🤖 AI-Powered Matching**: Uses GPT to understand preferences, lifestyle, and neighborhood vibes for smarter matches
- **📊 Two-Way Compatibility**: Analyzes both what you want and what you have to find mutual interest
- **🎯 Hybrid Scoring**: Combines structured data (60%) with semantic AI analysis (40%) for balanced results
- **💾 Save Favorites**: Keep track of listings you're interested in
- **👤 Guest Mode**: Try it out without creating an account
- **📱 Responsive Design**: Works beautifully on mobile and desktop
- **🔒 Secure**: Firebase authentication and secure data handling

## ℹ️ Overview

### What It Does

TauschMatch solves a real problem for people looking to swap apartments in Berlin. Traditional apartment exchange platforms require hours of manual browsing, reading descriptions, and hoping for mutual interest. Our platform uses AI to:

1. **Understand what you want** from your natural language description (e.g., "quiet area near parks, pet-friendly, good public transport")
2. **Understand what you have** by analyzing your apartment description and structured details
3. **Match intelligently** by comparing both sides: what you want vs what they have, and what you have vs what they want
4. **Score matches** using a hybrid approach that values both hard criteria (budget, rooms, location) and soft criteria (lifestyle, atmosphere, neighborhood feel)

### How It Works: Beyond Traditional Filtering

Traditional apartment exchange websites (like tauschwohnung.com) use simple filtering: you set criteria (max rent, min rooms, district) and either get results that match or are excluded. TauschMatch goes beyond this with intelligent **scoring and ranking** that considers nuance and two-way compatibility.

#### What Traditional Filtering Does
- **Binary pass/fail**: Listings either match your filters or are excluded
- **No ranking**: All results treated equally, usually sorted by date
- **One-way**: Only checks "what you want vs what they have"
- **No nuance**: A €750 apartment and €850 apartment (when you set max €800) are both excluded, even though €850 might be acceptable

#### How TauschMatch Works Differently

TauschMatch uses a **two-phase matching system** that scores and ranks every listing:

**Phase 1: Structured Matching (60% of score)**

Instead of simple filtering, TauschMatch **scores** each listing on a 0-10 scale based on how well it matches:

- **Budget scoring** (35% weight): 
  - €600 (20% under) → Excellent (35/35 points)
  - €800 (at budget) → Good (30/35 points)
  - €880 (10% over) → Still acceptable (22/35 points) — **not excluded!**
  - €960 (20% over) → Lower score (12/35 points) but still shown
  
- **Room matching** (30% weight):
  - 3 rooms (when you want 2) → Bonus for extra space (28/30 points)
  - 2 rooms (exact match) → Perfect (30/30 points)
  - 1 room (1 less) → Acceptable (18/30 points)
  
- **District matching** (20% weight): Detects related districts (e.g., "Kreuzberg" matches "Friedrichshain-Kreuzberg") and gives partial credit

- **Two-way compatibility**: Unlike traditional sites, TauschMatch checks **both directions**:
  - "What you want vs what they have" (traditional)
  - "What you have vs what they want" (ensures mutual compatibility)
    - Example: You have a balcony → They want "outdoor space" → Perfect match!

**Phase 2: Semantic Matching (40% of score)**

Uses OpenAI GPT-3.5-turbo to analyze descriptions and understand what structured data can't capture:
- Lifestyle preferences and neighborhood characteristics
- Apartment atmosphere and vibe
- Soft requirements that don't fit into filters
- Provides detailed match reasons explaining why each listing is a good fit

**Result**: Matches are **ranked by compatibility score** (combined structured + semantic), with the best swaps appearing first—not just by when they were posted. You see more relevant matches, ranked by actual compatibility.

## 🚀 Usage

### Quick Start

1. **Sign up** or continue as a guest
2. **Enter your apartment details**: rooms, size, rent, location, and a description
3. **Describe what you're looking for**: your preferences in natural language
4. **Click "Match"** and let AI find compatible swaps
5. **Browse results** with detailed match scores and reasons
6. **Save favorites** and contact listings you're interested in

### Example

```typescript
// Your Apartment
Rooms: 3
Size: 50 sqm
Rent: €1,100
Description: "Cozy 3-room apartment in Prenzlauer Berg, ground floor, 
              balcony with garden view, pet-friendly, quiet street"

// What You're Looking For
Min Rooms: 2
Min Size: 45 sqm
Max Rent: €800
Description: "Looking for something in Friedrichshain or Kreuzberg, 
              lively area near cafes, good public transport, 
              preferably higher floor with good light"
```

The AI will:
- Extract your preferences (lively area, cafes, good transport, light)
- Match against listings that have what you want
- Verify that your apartment meets their requirements
- Provide detailed compatibility reasons for each match

### Key Features

**Structured Matching Section** (Green box)
- Shows hard criteria matches: "Well within your budget: €750 (your max: €800)"
- Transparent and easy to understand

**Semantic Matching Section** (Blue box)
- AI-generated match reasons: "You want a lively area, and they offer an apartment in Kreuzberg near cafes"
- Explains lifestyle and neighborhood compatibility

**Two-Way Analysis**
- "What they have & you want": Shows how their apartment fits your preferences
- "What you have & they want": Shows how your apartment fits their needs

## ⬇️ Installation

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **Firebase account** (free tier works)
- **OpenAI API key** (for AI matching features)

### Quick Install

```bash
# Clone the repository
git clone https://github.com/yourusername/tauschmatch.git
cd tauschmatch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# OpenAI API Key for AI-powered matching
OPENAI_API_KEY=your_openai_api_key_here

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 🔧 Development

This section is for developers who want to contribute or understand the codebase.

### Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Firebase** - Authentication, Firestore database, and hosting
- **OpenAI GPT-3.5-turbo** - AI-powered semantic matching
- **Tailwind CSS** - Utility-first styling
- **React Icons** - Icon library

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes (login, signup)
│   ├── (protected)/       # Protected routes (match, profile, saved)
│   └── api/               # API routes for server-side logic
├── components/            # React components
│   ├── ApartmentForm.tsx  # Apartment input forms
│   ├── MatchCard.tsx      # Display individual matches
│   ├── Sidebar.tsx        # Navigation sidebar
│   └── AuthGuard.tsx      # Authentication wrapper
├── services/              # Business logic
│   ├── aiService.ts       # OpenAI GPT integration
│   ├── matchService.ts    # Matching algorithm
│   ├── userService.ts     # User data management
│   └── savedListingsService.ts  # Saved listings
├── hooks/                 # React hooks
│   └── useAuth.tsx        # Authentication hook
├── lib/                   # Configuration
│   ├── firebase.ts        # Firebase client setup
│   └── constants.ts       # App constants
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

### Key Services

**`aiService.ts`**
- Handles all OpenAI API interactions
- Extracts preferences from natural language
- Analyzes listings for semantic matching
- Batch processes multiple listings efficiently

**`matchService.ts`**
- Orchestrates the matching process
- Combines structured and semantic scores (60/40 split)
- Filters and sorts results
- Generates match reasons

**`userService.ts`**
- Manages user data in Firestore
- Handles apartment and preference storage
- Provides user CRUD operations

### Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Firebase deployment
npm run deploy           # Build and deploy to Firebase
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password and Anonymous)
3. Create a Firestore database
4. Set up Firebase Hosting (see `DEPLOYMENT.md`)
5. Add your Firebase config to `.env.local`

### API Costs

The AI matching feature uses OpenAI's GPT-3.5-turbo model. Costs vary by usage:
- **Per match request**: ~$0.05-0.10 (processes ~30 listings)
- **Recommended**: Enable auto-recharge on your OpenAI account
- **Fallback**: App gracefully handles quota exhaustion with structured-only matching

## 🏆 Examples

### Real-World Use Case

**The Problem**: Sarah wants to swap her 3-room Prenzlauer Berg apartment for something in Friedrichshain. She's tired of scrolling through listings manually.

**The Solution**: 
1. Sarah enters her apartment details and writes: "Looking for something more lively, near cafes, good for nightlife"
2. TauschMatch's AI understands she wants a vibrant, social neighborhood
3. It matches her with listings in Friedrichshain and Kreuzberg
4. Shows detailed reasons: "You want a lively area, and they offer an apartment in Friedrichshain near Simon-Dach-Straße (cafe district)"

**The Result**: Sarah finds 3 highly compatible matches in minutes instead of hours of manual browsing.

## 💭 Contributing

Contributions are welcome! Whether you want to report bugs, suggest features, or submit pull requests, we'd love to have your input.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Areas for Contribution

- 🐛 **Bug Fixes**: Help improve reliability
- ✨ **New Features**: Suggest or implement enhancements
- 📝 **Documentation**: Improve docs and examples
- 🎨 **UI/UX**: Make the interface even better
- 🌍 **Internationalization**: Help translate for other cities
- ⚡ **Performance**: Optimize matching algorithm or API calls

### Reporting Issues

Found a bug or have a suggestion? Please [open an issue](https://github.com/yourusername/tauschmatch/issues) with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

## 📖 Further Reading

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [How to Write a Good README](https://github.com/banesullivan/README) - Guidelines we followed

## 📄 License

MIT License - feel free to use this project for your own purposes.

---

Made with ❤️ for the Berlin apartment swapping community
