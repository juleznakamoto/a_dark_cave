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
    console.log('Authorization header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('Missing authorization header')
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
      console.error('Invalid authorization format:', authHeader.substring(0, 20))
      return new Response(
        JSON.stringify({ error: 'Invalid authorization format' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create client with anon key + user JWT
    const supabase = createClient(
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

    // Verify the JWT and get user (works with anon key + JWT)
    const jwt = authHeader.substring(7) // Remove 'Bearer ' prefix
    console.log('JWT token length:', jwt.length)
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found')
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: authError?.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    console.log('User authenticated:', user.id)

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
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
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

    console.log('Request body keys:', Object.keys(body))
    console.log('gameStateDiff type:', typeof gameStateDiff, 'is array:', Array.isArray(gameStateDiff))
    
    // Validate request shape
    if (!gameStateDiff || typeof gameStateDiff !== 'object' || Array.isArray(gameStateDiff)) {
      console.error('Invalid gameStateDiff validation failed')
      return new Response(
        JSON.stringify({ error: 'Invalid gameStateDiff: must be a non-null object' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (Object.keys(gameStateDiff).length === 0) {
      console.error('Empty gameStateDiff')
      return new Response(
        JSON.stringify({ error: 'Invalid gameStateDiff: cannot be empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    console.log('gameStateDiff keys:', Object.keys(gameStateDiff))

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