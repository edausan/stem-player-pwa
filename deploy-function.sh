#!/bin/bash

# Deployment script for Supabase Edge Function
# Run this script after logging in to Supabase CLI

set -e

echo "🚀 Deploying Supabase Edge Function: separate-stems"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "   Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Please run: supabase login"
    echo "   This will open a browser for authentication."
    exit 1
fi

# Project ref from .env.local
PROJECT_REF="kznginacvpvhhtwzixqz"

echo "📦 Linking project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

echo ""
echo "🚀 Deploying function: separate-stems"
supabase functions deploy separate-stems

echo ""
echo "✅ Deployment complete!"
echo ""
echo "The function is now available at:"
echo "https://$PROJECT_REF.supabase.co/functions/v1/separate-stems"
echo ""
echo "You can test it with:"
echo "supabase functions serve separate-stems"
