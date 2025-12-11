# Quick Start: Murf AI Setup

## Step 1: Get Your Murf AI API Key
1. Visit https://murf.ai/
2. Create an account or sign in
3. Go to API settings and generate an API key

## Step 2: Add to Environment Variables
Create or update your `.env.local` file in the project root:

```env
NEXT_PUBLIC_MURF_API_KEY=your_murf_api_key_here
```

## Step 3: Restart Development Server
After adding the API key, restart your Next.js dev server:

```bash
npm run dev
```

## Step 4: Test the Integration
1. Navigate to the **Commentary Tab**
2. Enable **"Voice Commentary"** checkbox
3. Select your preferences:
   - **Language**: English, Hindi, Spanish, Tamil, or Telugu
   - **Tone**: Calm, Exciting, Professional, or Dramatic
   - **Voice**: Male or Female
4. Click **"Test Voice"** button

You should hear the test message in your selected voice!

## What Changed?
- ✅ **Murf AI** is now the primary TTS service
- ✅ **AWS Polly** code has been preserved as comments
- ✅ Multi-language support with native voices
- ✅ Tone/emotion control for exciting commentary

## Supported Languages
| Language | Male Voice | Female Voice |
|----------|------------|--------------|
| English  | Finley (UK), Marcus (US) | Lily (UK), Natalie (US) |
| Hindi    | Vivaan | Kavya |
| Spanish  | Alvaro (ES), Diego (MX) | Lucia (ES), Sofia (MX) |
| Tamil    | Arun | Kavya |
| Telugu   | Siddharth | Ananya |

## Need Help?
See the full [Murf AI Integration Guide](./MURF_AI_INTEGRATION.md) for detailed documentation.
