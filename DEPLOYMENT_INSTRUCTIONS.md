# Quick Deployment Instructions

## ⚠️ Important: Manual Login Required

The Supabase CLI requires interactive authentication. Please follow these steps:

### Step 1: Login to Supabase

Open your terminal and run:

```bash
cd /Users/edmardausan/Downloads/stem-player-pwa
supabase login
```

This will:
- Open your browser for authentication
- Ask you to authorize the CLI
- Save your credentials locally

### Step 2: Run the Deployment Script

After logging in, run:

```bash
./deploy-function.sh
```

Or manually run these commands:

```bash
# Link your project
supabase link --project-ref kznginacvpvhhtwzixqz

# Deploy the function
supabase functions deploy separate-stems
```

### Step 3: Verify Deployment

The function will be available at:
```
https://kznginacvpvhhtwzixqz.supabase.co/functions/v1/separate-stems
```

## Alternative: Manual Commands

If you prefer to run commands manually:

```bash
# 1. Login (interactive - opens browser)
supabase login

# 2. Link project
supabase link --project-ref kznginacvpvhhtwzixqz

# 3. Deploy function
supabase functions deploy separate-stems

# 4. (Optional) Test locally
supabase functions serve separate-stems
```

## Troubleshooting

### "Access token not provided"
- Make sure you've run `supabase login` first
- The login command opens a browser for authentication

### "Project not found"
- Verify your project ref: `kznginacvpvhhtwzixqz`
- Check your Supabase dashboard: https://app.supabase.com/project/kznginacvpvhhtwzixqz

### "Function deploy failed"
- Check that you're in the project directory
- Verify the function file exists: `supabase/functions/separate-stems/index.ts`

## After Deployment

Once deployed, the stem separation feature will work without CORS errors. Test it by:
1. Opening your app
2. Going to the upload page
3. Selecting "Upload Song" mode
4. Uploading a song file

The function will automatically separate the song into stems!
