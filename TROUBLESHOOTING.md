# Troubleshooting: 401 Unauthorized Error

If you're getting a `401 (Unauthorized)` error when trying to use stem separation, it means the Edge Function either:

1. **Hasn't been deployed yet** (most common)
2. **Requires authentication** (if you enabled it)
3. **Has a configuration issue**

## Quick Fix

### Step 1: Deploy the Function

Make sure you've deployed the Edge Function:

```bash
cd /Users/edmardausan/Downloads/stem-player-pwa

# Login to Supabase (if not already logged in)
supabase login

# Link your project
supabase link --project-ref kznginacvpvhhtwzixqz

# Deploy the function
supabase functions deploy separate-stems
```

### Step 2: Verify Deployment

After deploying, you should see output like:
```
Deploying function separate-stems...
Function separate-stems deployed successfully
```

### Step 3: Test the Function

You can test if the function is working by checking the Supabase dashboard:
- Go to: https://app.supabase.com/project/kznginacvpvhhtwzixqz/functions
- You should see `separate-stems` listed

## Alternative: Check Function Status

If the function is deployed but still giving 401 errors:

1. **Check if authentication is required:**
   - Open `supabase/functions/separate-stems/index.ts`
   - Make sure the authentication block is commented out (lines 23-47)

2. **Redeploy the function:**
   ```bash
   supabase functions deploy separate-stems
   ```

3. **Check function logs:**
   ```bash
   supabase functions logs separate-stems
   ```

## Still Having Issues?

If you continue to have problems:

1. **Verify your Supabase project is active:**
   - Check: https://app.supabase.com/project/kznginacvpvhhtwzixqz

2. **Check your environment variables:**
   - Make sure `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

3. **Try testing the function directly:**
   ```bash
   curl -X POST https://kznginacvpvhhtwzixqz.supabase.co/functions/v1/separate-stems \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"instances":[{"b64":"..."}]}'
   ```

## Common Error Messages

- **"Edge Function returned a non-2xx status code"** → Function not deployed or authentication issue
- **"Function not found"** → Function hasn't been deployed
- **"Unauthorized"** → Function requires authentication or deployment issue
