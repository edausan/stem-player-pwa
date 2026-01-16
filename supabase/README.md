# Supabase Edge Functions

This directory contains Supabase Edge Functions for the stem player PWA.

## Functions

### `separate-stems`

Proxies requests to the Demucs API to avoid CORS issues. The function:
- Authenticates the user
- Forwards the request to the Demucs API
- Returns the separated stems with proper CORS headers

## Deployment

To deploy the Edge Functions, you need to:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy separate-stems
   ```

## Local Development

To test the function locally:

```bash
supabase functions serve separate-stems
```

## Environment Variables

The function uses the following environment variables (automatically provided by Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Authentication

The function requires authentication. Users must be logged in to use the stem separation feature.
