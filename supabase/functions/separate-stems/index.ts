// Supabase Edge Function to proxy Demucs API requests
// This avoids CORS issues by making server-to-server requests

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEMUCS_API_URL = 'https://demucs-api-hwbhnojdya-uc.a.run.app/predict'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Optional: Verify authentication
    // Uncomment the following block if you want to require authentication
    /*
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    */

    // Parse the request body
    const requestData = await req.json()

    // Validate request structure
    if (!requestData.instances || !Array.isArray(requestData.instances) || requestData.instances.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: missing instances array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Forward the request to Demucs API
    const demucsResponse = await fetch(DEMUCS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    if (!demucsResponse.ok) {
      const errorText = await demucsResponse.text()
      return new Response(
        JSON.stringify({ 
          error: `Demucs API error: ${demucsResponse.status} ${demucsResponse.statusText}`,
          details: errorText
        }),
        {
          status: demucsResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await demucsResponse.json()

    // Return the result with CORS headers
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in separate-stems function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
