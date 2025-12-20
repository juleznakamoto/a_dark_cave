import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiting (per isolate)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100

// Create Supabase client once per isolate (reused across requests)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization format' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the JWT and get user
    const jwt = authHeader.substring(7) // Remove 'Bearer ' prefix
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Rate limit: 2 saves per second per user
    if (!checkRateLimit(user.id, 2, 1000)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const body = await req.json()
    const {
      gameStateDiff,
      clickAnalytics,
      resourceAnalytics,
      clearAnalytics,
      allowPlaytimeOverwrite
    } = body

    // Validate request shape
    if (!gameStateDiff || typeof gameStateDiff !== 'object' || Array.isArray(gameStateDiff)) {
      return new Response(
        JSON.stringify({ error: 'Invalid gameStateDiff: must be a non-null object' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (Object.keys(gameStateDiff).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid gameStateDiff: cannot be empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate payload size (prevent abuse)
    const payloadSize = JSON.stringify(body).length
    if (payloadSize > 500000) { // 500KB limit
      return new Response(
        JSON.stringify({ error: 'Payload too large' }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call the database function with service role
    // User ID is derived from auth.uid() inside the SQL function
    const { error: dbError } = await supabase.rpc('save_game_with_analytics', {
      p_game_state_diff: gameStateDiff,
      p_click_analytics: clickAnalytics || null,
      p_resource_analytics: resourceAnalytics || null,
      p_clear_analytics: clearAnalytics || false,
      p_allow_playtime_overwrite: allowPlaytimeOverwrite || false
    })

    if (dbError) {
      console.error('Database error:', dbError)
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
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})