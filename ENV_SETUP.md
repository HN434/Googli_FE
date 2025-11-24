# Environment Variables Setup

This project uses environment variables to securely store API keys and configuration.

## Required Environment Variables

### 1. RapidAPI Key

The application uses the Cricbuzz Cricket API from RapidAPI for live match data.

**Variable Name:** `NEXT_PUBLIC_RAPIDAPI_KEY`

**How to get your API key:**
1. Go to [RapidAPI Cricbuzz Cricket API](https://rapidapi.com/cricketapilive/api/cricbuzz-cricket)
2. Sign up or log in to RapidAPI
3. Subscribe to the API (free tier available)
4. Copy your API key from the dashboard

### 2. Backend WebSocket URL (Optional)

**Variable Name:** `NEXT_PUBLIC_BACKEND_WS_URL`

**Default:** `https://z34lswxm-8001.inc1.devtunnels.ms/api/commentary/ws/match/`

This is the WebSocket endpoint for real-time commentary updates. You can override this if you're running your own backend.

## Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` and add your API key:**
   ```env
   NEXT_PUBLIC_RAPIDAPI_KEY=your_actual_api_key_here
   NEXT_PUBLIC_BACKEND_WS_URL=https://your-backend-url.com/api/commentary/ws/match/
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## Security Notes

- ⚠️ **Never commit `.env.local` to version control** - it's already in `.gitignore`
- ✅ The `.env.example` file is safe to commit (contains no real keys)
- 🔒 In production, use your hosting platform's environment variable settings (Vercel, Netlify, etc.)

## Troubleshooting

**Error: "API key not configured"**
- Make sure `.env.local` exists in the project root
- Verify the variable name is exactly `NEXT_PUBLIC_RAPIDAPI_KEY`
- Restart your development server after adding the variable

**No matches loading:**
- Check that your RapidAPI subscription is active
- Verify your API key is correct
- Check the browser console for detailed error messages
