# Deployment Guide: Stem Separation Feature

## CORS Issue Resolution

The Demucs API doesn't support CORS, so we use a Supabase Edge Function as a proxy to avoid CORS issues.

## Quick Setup

### Option 1: Deploy Supabase Edge Function (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   You can find your project ref in your Supabase dashboard URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`

4. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy separate-stems
   ```

5. **Test the function** (optional):
   ```bash
   supabase functions serve separate-stems
   ```

The function will be available at: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/separate-stems`

### Option 2: Temporary Workaround (Development Only)

If you need to test immediately without deploying, you can temporarily use a CORS proxy service. However, this is **NOT recommended for production**.

Update `src/services/stemSeparationService.ts` to use a CORS proxy:

```typescript
// TEMPORARY: Only for development testing
const DEMUCS_API_URL = 'https://cors-anywhere.herokuapp.com/https://demucs-api-hwbhnojdya-uc.a.run.app/predict'
```

**Warning**: CORS proxy services are unreliable and may have rate limits. Always use the Edge Function approach for production.

## Verification

After deploying the Edge Function:

1. The stem separation feature should work without CORS errors
2. Check the browser console for any errors
3. Test with a small audio file first (processing can take 5+ minutes)

## Troubleshooting

### Function not found error
- Make sure you've deployed the function: `supabase functions deploy separate-stems`
- Check that your project is linked correctly: `supabase link --project-ref YOUR_PROJECT_REF`

### Authentication errors
- The function currently allows unauthenticated access (for easier testing)
- To require authentication, uncomment the auth check in `supabase/functions/separate-stems/index.ts`

### Timeout errors
- Stem separation can take 5+ minutes for longer songs
- Consider adding a timeout handler or progress polling mechanism

## Production Considerations

1. **Rate Limiting**: Consider adding rate limiting to prevent abuse
2. **Authentication**: Enable authentication requirement for production
3. **Error Handling**: Add retry logic for transient failures
4. **Monitoring**: Set up logging and monitoring for the Edge Function
5. **Costs**: Monitor Supabase Edge Function usage and costs
