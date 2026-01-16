// Supabase Edge Function to proxy Demucs API requests
// This avoids CORS issues by making server-to-server requests
// This file runs in Deno runtime - Deno global is available at runtime

const DEMUCS_API_URL = 'https://demucs-api-hwbhnojdya-uc.a.run.app/predict'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-expect-error - Deno is a global in Deno runtime, not available in TypeScript types
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Basic validation: ensure request has some form of Supabase auth
    // (anon key or user token - both are valid for this function)
    const authHeader = req.headers.get('Authorization')
    const apikeyHeader = req.headers.get('apikey')
    
    // At minimum, we should have either Authorization or apikey header
    // supabase.functions.invoke() automatically includes these
    if (!authHeader && !apikeyHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization. Please ensure you are logged in.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

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
