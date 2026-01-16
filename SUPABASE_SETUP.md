# Supabase Setup Guide

This document outlines the required Supabase configuration for the StemLab PWA.

## 1. Database Table Setup

### Create `songs` table

Run this SQL in the Supabase SQL Editor:

```sql
-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stems TEXT[] NOT NULL,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_updated_at ON songs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_is_public ON songs(is_public) WHERE is_public = TRUE;

-- Enable Row Level Security
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
```

### Row Level Security (RLS) Policies

```sql
-- Policy: Users can view their own songs OR public songs
CREATE POLICY "Users can view own or public songs"
  ON songs FOR SELECT
  USING (
    auth.uid() = user_id OR 
    is_public = TRUE
  );

-- Policy: Users can insert their own songs
CREATE POLICY "Users can insert own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own songs
CREATE POLICY "Users can update own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own songs
CREATE POLICY "Users can delete own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);
```

**Note:** Public songs are visible to everyone (including unauthenticated users), while private songs are only visible to their owners.

## 2. Storage Bucket Setup

### Create Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Click "New bucket"
3. Name: `songs`
4. Public: **No** (private bucket)
5. File size limit: Adjust based on your needs (default 50MB is usually sufficient)
6. Allowed MIME types: `audio/*`

### Storage Policies

Storage policies control access to files in your bucket. These policies are added to the `storage.objects` table.

**Where to add policies:**

You can add these policies in two ways:

1. **Via SQL Editor (Recommended)**: 
   - Go to SQL Editor in Supabase Dashboard
   - Create a new query
   - Paste the policies below and run them

2. **Via Storage Dashboard**:
   - Go to Storage in Supabase Dashboard
   - Click on your `songs` bucket
   - Navigate to the "Policies" tab
   - Click "New Policy" and use the SQL below

**Note**: These policies are applied to `storage.objects`, not directly to buckets. They control access to objects within the `songs` bucket.

Add these policies:

**Policy 1: Users can upload to their own folder**
```sql
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'songs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Policy 2: Users can read their own files**
```sql
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'songs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Note:** For public songs to be accessible to guest users, you have two options:
1. **Use signed URLs** (recommended): Generate signed URLs server-side for public songs
2. **Create a public bucket**: Make a separate public bucket for public songs (requires additional setup)

The current policy only allows authenticated users to read their own files. Public song file access requires additional implementation in your application code.

**Policy 3: Users can update their own files**
```sql
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'songs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Policy 4: Users can delete their own files**
```sql
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'songs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

## 3. Environment Variables

### Local Development

Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in:
- Supabase Dashboard → Settings → API
- URL: `Project URL`
- Anon Key: `anon` `public` key (NOT the `service_role` key)

### Vercel Deployment

To add environment variables to Vercel:

**Option 1: Via Vercel Dashboard (Recommended)**

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase project URL
   - **Environments**: Select Production, Preview, and Development
   - Click **Save**
   
   Repeat for:
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase anon key
   - **Environments**: Select Production, Preview, and Development
   - Click **Save**

4. **Redeploy** your application for the changes to take effect:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Select **Redeploy**

**Option 2: Via Vercel CLI**

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Pull environment variables to verify
vercel env pull .env.local
```

**Important Notes:**
- Environment variables prefixed with `VITE_` are exposed to the browser
- The anon key is safe to expose (it's designed for client-side use)
- Never commit your `.env.local` file to git (it's already in `.gitignore`)
- After adding variables in Vercel, you must redeploy for them to take effect

## 4. File Structure in Storage

Files are stored in the following structure:
```
songs/
  {user_id}/
    songs/
      {song_id}/
        {stem_name}.mp3
        ...
```

Example:
```
songs/
  abc123-def456-ghi789/
    songs/
      song_1234567890_abc123/
        drums.mp3
        bass.mp3
        vocals.mp3
        others.mp3
```

## 5. Guest User Access (Public Songs)

### Public Song Access

Public songs can be accessed by anyone, including unauthenticated users. The RLS policies allow:
- **Public songs**: Visible to everyone (authenticated and guest users)
- **Private songs**: Only visible to the song owner

### Storage Access for Public Songs

For public songs to be accessible to guest users, you may need to add an additional storage policy that allows anonymous access to public song files. However, for security reasons, it's recommended to keep the storage bucket private and use signed URLs or a backend API to serve public song files.

Alternatively, you can create a public bucket specifically for public songs, but this requires additional setup and management.

## 6. Authentication Setup

### Email Authentication (Default)

Email authentication is enabled by default in Supabase. No additional setup needed.

### Optional: Enable Email Confirmation

If you want to require email confirmation:
1. Go to Authentication → Settings
2. Enable "Enable email confirmations"
3. Configure your email templates if needed

### Optional: Social Auth Providers

To enable Google, GitHub, etc.:
1. Go to Authentication → Providers
2. Enable your desired provider
3. Configure OAuth credentials
4. Update `AuthModal.vue` to include social login buttons

## 7. Testing

### Test RLS Policies

1. Sign up with two different accounts
2. Upload songs with each account
3. Verify each account only sees their own songs
4. Try to access another user's song ID - should fail

### Test Storage Policies

1. Try to upload to another user's folder - should fail
2. Try to download another user's file - should fail
3. Verify files are organized correctly in storage

## 8. Database Functions (Optional)

You can add a function to automatically update `updated_at`:

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 9. Monitoring and Limits

### Free Tier Limits
- Database: 500 MB
- Storage: 1 GB
- Bandwidth: 2 GB/month

### Monitor Usage
- Dashboard → Settings → Usage
- Set up alerts for approaching limits

## 10. Backup and Recovery

### Database Backups
- Automatic daily backups on paid plans
- Manual backups available via SQL dump

### Storage Backups
- Consider periodic exports for important data
- Supabase doesn't automatically backup storage

## Troubleshooting

### Common Issues

1. **RLS blocking queries**: Ensure policies are correctly set up and user is authenticated
2. **Storage upload fails**: Check bucket name, policies, and file size limits
3. **Sync not working**: Verify environment variables and network connectivity
4. **Auth errors**: Check email confirmation settings and provider configuration
