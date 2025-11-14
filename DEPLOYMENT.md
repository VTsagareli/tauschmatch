# Firebase Hosting Deployment Guide

## Prerequisites

1. **Firebase CLI installed**: Already installed ✓
2. **Firebase project**: `tauschmatch` (already configured) ✓
3. **Logged in**: Run `firebase login` if needed

## Setup Steps

### 1. Install Function Dependencies
```bash
cd functions
npm install
cd ..
```

### 2. Build the Next.js App
```bash
npm run build
```

### 3. Deploy to Firebase
```bash
npm run deploy
```

Or deploy separately:
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy functions only  
firebase deploy --only functions

# Deploy both
firebase deploy --only hosting,functions
```

## Important Notes

- **API Routes**: Your Next.js API routes (`/api/*`) will work through Firebase Functions
- **Environment Variables**: Set environment variables in Firebase Functions:
  ```bash
  firebase functions:config:set openai.api_key="your-key"
  ```
  Or use Firebase Console → Functions → Configuration → Environment Variables
- **Firestore Rules**: Already configured in `firestore.rules`
- **Anonymous Auth**: Enable Anonymous Authentication in Firebase Console (Authentication → Sign-in method → Anonymous)

## Troubleshooting

- Check Firebase Functions logs:
  ```bash
  firebase functions:log
  ```
- Make sure all environment variables are set
- Verify project ID in `.firebaserc` matches your Firebase project

## Free Tier Limits

Firebase Hosting free tier includes:
- 10 GB storage
- 360 MB/day data transfer
- Custom domain support
- SSL certificates

Firebase Functions free tier (Spark plan):
- 2 million invocations/month
- 400,000 GB-seconds compute time
- 200,000 CPU-seconds
