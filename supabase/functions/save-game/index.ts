
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client once per isolate
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Simple in-memory rate limiting (per isolate)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Early payload size check (before parsing)
    const contentLength = req.headers.get('Content-Length')
    if (contentLength && parseInt(contentLength) > 500000) {
      return new Response(
        JSON.stringify({ error: 'Payload too large', requestId }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log(`[${requestId}] Authorization header present:`, !!authHeader)
    
    if (!authHeader) {
      console.error(`[${requestId}] Missing authorization header`)
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', requestId }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      console.error(`[${requestId}] Invalid authorization format:`, authHeader.substring(0, 20))
      return new Response(
        JSON.stringify({ error: 'Invalid authorization format', requestId }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the JWT and get user
    const jwt = authHeader.substring(7) // Remove 'Bearer ' prefix
    console.log(`[${requestId}] JWT token length:`, jwt.length)
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      console.error(`[${requestId}] Auth error:`, authError?.message || 'No user found')
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: authError?.message, requestId }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    console.log(`[${requestId}] User authenticated:`, user.id)

    // Rate limit: 2 saves per second per user
    if (!checkRateLimit(user.id, 2, 1000)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please slow down.', requestId }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse JSON body:`, parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', requestId }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const {
      gameStateDiff,
      clickAnalytics,
      resourceAnalytics,
      clearAnalytics,
      allowPlaytimeOverwrite
    } = body

    console.log(`[${requestId}] Request body keys:`, Object.keys(body))
    console.log(`[${requestId}] gameStateDiff type:`, typeof gameStateDiff, 'is array:', Array.isArray(gameStateDiff))
    
    // Validate request shape
    if (!gameStateDiff || typeof gameStateDiff !== 'object' || Array.isArray(gameStateDiff)) {
      console.error(`[${requestId}] Invalid gameStateDiff validation failed`)
      return new Response(
        JSON.stringify({ error: 'Invalid gameStateDiff: must be a non-null object', requestId }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (Object.keys(gameStateDiff).length === 0) {
      console.error(`[${requestId}] Empty gameStateDiff`)
      return new Response(
        JSON.stringify({ error: 'Invalid gameStateDiff: cannot be empty', requestId }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    console.log(`[${requestId}] gameStateDiff keys:`, Object.keys(gameStateDiff))

    // Backup size check (in case Content-Length was missing)
    const payloadSize = JSON.stringify(body).length
    if (payloadSize > 500000) {
      return new Response(
        JSON.stringify({ error: 'Payload too large', requestId }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call the database function with the user's JWT context
    // We need to create a new client instance with the user's JWT for this RPC call
    const userScopedClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const isDevMode = Deno.env.get('ENVIRONMENT') === 'development' || Deno.env.get('SUPABASE_URL')?.includes('localhost') || !Deno.env.get('ENVIRONMENT');
    console.log(`[${requestId}] Environment:`, Deno.env.get('ENVIRONMENT'), 'isDevMode:', isDevMode);

    const { error: dbError } = await userScopedClient.rpc('save_game_with_analytics', {
      p_game_state_diff: gameStateDiff,
      p_click_analytics: clickAnalytics || null,
      p_resource_analytics: resourceAnalytics || null,
      p_clear_analytics: clearAnalytics || false,
      p_allow_playtime_overwrite: allowPlaytimeOverwrite || false,
      p_skip_validation: isDevMode
    })

    if (dbError) {
      console.error(`[${requestId}] Database error:`, dbError)
      throw dbError
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error(`[${requestId}] Edge function error:`, error)
    return new Response(
      JSON.stringify({ error: error.message, requestId }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
