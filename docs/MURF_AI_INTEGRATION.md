# Murf AI Integration Guide

## Overview
This project has been integrated with **Murf AI**, a premium text-to-speech service that provides high-quality, natural-sounding AI voices with emotion and tone control.

## Features
✅ **Multi-language support**: English, Hindi, Spanish, Tamil, Telugu  
✅ **Gender options**: Male and Female voices  
✅ **Tone/Style control**: Calm, Exciting, Professional, Dramatic  
✅ **High-quality audio**: Uses Murf's FALCON AI model with 24kHz sample rate  
✅ **Real-time commentary**: Perfect for live cricket match commentary  

## Setup Instructions

### 1. Get Your Murf AI API Key
1. Visit [Murf AI](https://murf.ai/) and create an account
2. Navigate to your API settings/dashboard
3. Generate an API key

### 2. Add API Key to Environment Variables
Add the following to your `.env.local` file:

```env
# Murf AI Configuration
NEXT_PUBLIC_MURF_API_KEY=your_murf_api_key_here
```

### 3. Verify Installation
The integration will automatically initialize when you load the Commentary Tab. Check the browser console for:
```
Murf AI initialized successfully
```

## Supported Languages and Voices

### English
- **Male**: 
  - Finley (British, Conversational)
  - Marcus (American, Professional)
  - Wayne (American, Calm)
  - Clint (American, Exciting)
  - Terrell (American, Dramatic)
- **Female**:
  - Lily (British, Conversational)
  - Natalie (American, Professional)
  - Rebecca (American, Calm)
  - Kelly (American, Exciting)
  - Scarlett (American, Dramatic)

### Hindi
- **Male**: Vivaan
- **Female**: Kavya

### Spanish
- **Male**: 
  - Alvaro (European Spanish)
  - Diego (Mexican Spanish)
- **Female**:
  - Lucia (European Spanish)
  - Sofia (Mexican Spanish)

### Tamil
- **Male**: Arun
- **Female**: Kavya

### Telugu
- **Male**: Siddharth
- **Female**: Ananya

## Tone/Style Options

1. **Calm**: Slower pace with lower pitch - ideal for professional analysis
2. **Exciting**: Faster pace with higher energy - perfect for exciting moments (4s, 6s, wickets)
3. **Professional**: Balanced and clear - default commentary style
4. **Dramatic**: Emotional and expressive - great for match-winning moments

## How It Works

### Voice Selection
The system automatically selects the most appropriate voice based on:
- Selected language (English, Hindi, Spanish, Tamil, Telugu)
- Selected gender (Male/Female)
- Selected tone (Calm, Exciting, Professional, Dramatic)

### Request Flow
1. User enables voice commentary in the Commentary Tab
2. Commentary text is formatted (emojis removed, special characters cleaned)
3. Request sent to Murf AI API with:
   - Voice ID (based on language + gender + tone)
   - Style/emotion (based on tone)
   - Text content
   - Locale (e.g., en-UK, hi-IN)
   - Format: MP3, 24kHz, Mono
4. Audio received and played automatically

### Example API Request
```javascript
{
  "voiceId": "en-UK-finley",
  "style": "Conversational",
  "text": "What a shot! That's a magnificent six!",
  "multiNativeLocale": "en-UK",
  "model": "FALCON",
  "format": "MP3",
  "sampleRate": 24000,
  "channelType": "MONO"
}
```

## AWS Polly Fallback (Commented Out)

The original AWS Polly implementation has been preserved as commented code for reference:

```typescript
// AWS Polly Service (commented out, using Murf AI instead)
// import pollyService from '@/services/pollyService';

// Example usage (commented):
// pollyService.speakCommentary(text, language, gender, tone);
```

To switch back to AWS Polly:
1. Uncomment the `pollyService` import
2. Comment out the `murfService` import
3. Replace all `murfService` calls with `pollyService`
4. Add AWS credentials to `.env.local`:
   ```env
   NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_aws_access_key
   NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   ```

## Testing

### Test Voice Button
1. Open the Commentary Tab
2. Enable "Voice Commentary" checkbox
3. Select your preferred Language, Tone, and Voice
4. Click the "Test Voice" button
5. You should hear: "This is a test of the voice commentary system. Welcome to Googli AI!"

### Live Commentary Test
1. Select a live cricket match from the dropdown
2. Enable "Voice Commentary"
3. Click "Start Commentary"
4. The system will speak each ball's commentary with a 6-second delay between balls

## Troubleshooting

### No Audio Output
- ✅ Check that `NEXT_PUBLIC_MURF_API_KEY` is set in `.env.local`
- ✅ Check browser console for initialization errors
- ✅ Ensure Voice Commentary checkbox is enabled
- ✅ Check browser volume and audio permissions

### API Errors
- ✅ Verify your Murf AI API key is valid
- ✅ Check your Murf AI account has sufficient credits
- ✅ Review browser console for detailed error messages

### Voice Not Changing
- ✅ Language, Tone, and Gender settings are cached per session
- ✅ Stop and restart commentary to apply new settings
- ✅ For language changes during active commentary, the WebSocket will reconnect automatically

## Pricing

Murf AI operates on a credit-based system. Check [Murf AI Pricing](https://murf.ai/pricing) for current rates.

## Files Modified

1. **`services/murfService.ts`** (NEW)
   - Murf AI service implementation
   - Voice configuration mapping
   - API integration logic

2. **`components/features/tabs/CommentaryTab.tsx`** (MODIFIED)
   - Integrated Murf AI service
   - Commented out AWS Polly code
   - Added Murf API key initialization

## Support

For issues specific to:
- **Murf AI API**: Contact [Murf AI Support](https://murf.ai/support)
- **Integration issues**: Check browser console logs and review this guide

---

**Note**: AWS Polly code has been preserved as comments for easy rollback if needed.
