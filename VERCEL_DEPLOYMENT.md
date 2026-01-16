# Deploying to Vercel

## Overview

Yes, you can absolutely use the Supabase Edge Function fix when deploying to Vercel! Here's why:

- **Edge Function runs on Supabase** - It's deployed to Supabase's infrastructure, not Vercel
- **Frontend runs on Vercel** - Your Vue app will be hosted on Vercel
- **They communicate via HTTP** - The frontend calls the Edge Function over HTTPS, just like from localhost

## Architecture

```
┌─────────────────┐         HTTPS          ┌──────────────────┐
│   Vercel        │  ───────────────────>  │   Supabase       │
│   (Frontend)    │                         │   (Edge Function)│
│                 │  <───────────────────   │                  │
│  Vue App        │         Response        │  separate-stems   │
└─────────────────┘                         └──────────────────┘
                                                      │
                                                      │ HTTPS
                                                      ▼
                                            ┌──────────────────┐
                                            │   Demucs API     │
                                            │   (External)     │
                                            └──────────────────┘
```

## Deployment Steps

### 1. Deploy Edge Function to Supabase (Do this first!)

The Edge Function must be deployed to Supabase before deploying to Vercel:

```bash
cd /Users/edmardausan/Downloads/stem-player-pwa

# Login to Supabase
supabase login

# Link project
supabase link --project-ref kznginacvpvhhtwzixqz

# Deploy function
supabase functions deploy separate-stems
```

**Important**: The Edge Function URL will be:
```
https://kznginacvpvhhtwzixqz.supabase.co/functions/v1/separate-stems
```

This URL works from anywhere (Vercel, localhost, etc.) as long as you have the correct Supabase credentials.

### 2. Deploy Frontend to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Or deploy to production
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Configure environment variables (see below)
4. Deploy

### 3. Configure Environment Variables in Vercel

**Critical**: You must add your Supabase credentials to Vercel's environment variables:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

```
VITE_SUPABASE_URL=https://kznginacvpvhhtwzixqz.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Where to find your anon key:**
- Supabase Dashboard → Project Settings → API
- Look for "anon" or "public" key

**Important Notes:**
- Add these for **Production**, **Preview**, and **Development** environments
- The values are the same as in your `.env.local` file
- Vercel will rebuild your app after adding environment variables

### 4. Build Configuration

Vercel should automatically detect your Vite project. If needed, you can create a `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## How It Works

1. **User uploads song** on your Vercel-hosted app
2. **Frontend calls Edge Function** via `supabase.functions.invoke('separate-stems')`
3. **Edge Function** (on Supabase) proxies request to Demucs API
4. **Demucs API** processes the audio and returns stems
5. **Edge Function** returns stems to frontend
6. **Frontend** saves stems to IndexedDB and Supabase Storage

## Testing After Deployment

1. Visit your Vercel deployment URL
2. Try uploading a song using the "Upload Song" feature
3. Check browser console for any errors
4. Verify stems are separated and saved

## Troubleshooting

### "Edge Function not found" error on Vercel

- Make sure the Edge Function is deployed to Supabase first
- Check that environment variables are set correctly in Vercel
- Verify the Supabase URL in Vercel matches your project

### CORS errors on Vercel

- The Edge Function handles CORS, so this shouldn't happen
- If you see CORS errors, verify the Edge Function is deployed and accessible

### Environment variables not working

- Make sure variable names start with `VITE_` (required for Vite)
- Redeploy after adding/changing environment variables
- Check that variables are added to the correct environment (Production/Preview)

## Security Notes

✅ **Safe to expose:**
- `VITE_SUPABASE_URL` - Public URL
- `VITE_SUPABASE_ANON_KEY` - Public key (has RLS protection)

❌ **Never expose:**
- Service role keys
- Database passwords
- Any secrets

The anon key is safe to use in the frontend because Supabase Row Level Security (RLS) protects your data.

## Cost Considerations

- **Vercel**: Free tier includes generous limits for static sites
- **Supabase Edge Functions**: Free tier includes 500K invocations/month
- **Demucs API**: Free (but slow, ~5 minutes per song)

For production, consider:
- Monitoring Edge Function usage
- Setting up rate limiting
- Caching strategies if needed

## Next Steps

1. ✅ Deploy Edge Function to Supabase
2. ✅ Set up Vercel project
3. ✅ Add environment variables
4. ✅ Deploy frontend
5. ✅ Test stem separation feature

The Edge Function will work seamlessly from your Vercel deployment! 🚀
