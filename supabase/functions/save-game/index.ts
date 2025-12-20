
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory rate limiting (resets on cold start, but good enough)
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT and get user
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      throw new Error('Invalid token')
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

    // Validate payload size (prevent abuse)
    const payloadSize = JSON.stringify(body).length
    if (payloadSize > 500000) { // 500KB limit
      throw new Error('Payload too large')
    }

    // Call the database function with service role (bypassing RLS)
    // User ID comes from verified JWT, not from client
    const { error: dbError } = await supabase.rpc('save_game_with_analytics', {
      p_user_id: user.id, // Trusted user ID from JWT
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
