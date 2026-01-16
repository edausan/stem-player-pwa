# Edge Function Authentication Fix

## Problem
Getting `401 Invalid JWT` error when calling the Edge Function.

## Solution

The Edge Function needs to be configured to accept requests. Supabase Edge Functions automatically validate JWTs, but you may need to ensure the function is properly deployed.

### Option 1: Redeploy the Function

The function should automatically accept requests with valid Supabase credentials. Try redeploying:

```bash
supabase functions deploy separate-stems
```

### Option 2: Check Function Configuration

Make sure the function is set to allow invocations. In Supabase Dashboard:
1. Go to Edge Functions
2. Check the `separate-stems` function
3. Ensure it's enabled and accessible

### Option 3: Verify Environment Variables

The function uses environment variables automatically provided by Supabase. No additional configuration needed.

### Option 4: Test Function Directly

You can test if the function is working by calling it directly with curl:

```bash
curl -X POST https://kznginacvpvhhtwzixqz.supabase.co/functions/v1/separate-stems \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"instances":[{"b64":"..."}]}'
```

Replace `YOUR_ANON_KEY` with your Supabase anon key from `.env.local`.

## Current Implementation

The Edge Function now:
- Accepts requests with valid Supabase credentials (anon key or user JWT)
- Automatically validates authentication via Supabase's built-in validation
- No manual JWT validation needed

The `supabase.functions.invoke()` method automatically includes the necessary auth headers.
