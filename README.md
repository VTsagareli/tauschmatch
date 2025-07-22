# TauschMatch

A Next.js application for finding apartment exchanges in Berlin using AI-powered matching.

## Features

- **AI-Powered Matching**: Uses GPT to analyze user preferences and listing descriptions for semantic matching
- **Traditional Scoring**: Combines AI matching with traditional criteria (budget, rooms, location)
- **Smart Preference Extraction**: Automatically extracts preferences from user descriptions
- **Detailed Match Analysis**: Shows both traditional and AI scores with detailed breakdowns
- **Firebase Integration**: User authentication and data storage
- **Responsive Design**: Works on mobile and desktop

## Setup

### Prerequisites

- Node.js 18+ 
- Firebase project
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:
   ```bash
   # OpenAI API Key for AI-powered matching
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Firebase Config
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
   ```

4. Run the development server:
```bash
npm run dev
   ```

## AI-Powered Matching

The application uses OpenAI's GPT model to enhance apartment matching:

### Phase 1 Features (Current)
- **Smart Preference Extraction**: Analyzes user descriptions to extract structured preferences
- **Semantic Listing Analysis**: Analyzes listing descriptions for features, amenities, and suitability
- **Intelligent Scoring**: Combines traditional criteria (60%) with AI semantic matching (40%)

### How It Works
1. User provides apartment details and preferences
2. AI extracts structured preferences from user descriptions
3. AI analyzes each listing description for features and suitability
4. Matching algorithm combines traditional and semantic scores
5. Results are displayed with detailed breakdowns and match reasons

### API Usage
The AI service uses GPT-3.5-turbo for:
- Extracting user preferences from natural language descriptions
- Analyzing listing descriptions for features and amenities
- Calculating semantic match scores based on lifestyle and neighborhood preferences

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── (auth)/            # Authentication pages
│   ├── (protected)/       # Protected pages (match, profile)
│   └── api/               # API routes
├── components/            # React components
├── services/              # Business logic
│   ├── aiService.ts       # AI/GPT integration
│   ├── matchService.ts    # Matching algorithm
│   └── userService.ts     # User management
├── types/                 # TypeScript types
├── lib/                   # Firebase configuration
└── utils/                 # Utility functions
```

## Technologies Used

- **Next.js 14** - React framework with app router
- **TypeScript** - Type safety
- **Firebase** - Authentication and Firestore database
- **OpenAI GPT** - AI-powered matching
- **Pico CSS** - Minimal styling framework
- **Tailwind CSS** - Utility-first CSS framework

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
