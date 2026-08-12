// Admin-only user invite. Holds the service_role key server-side —
// never expose this key to the browser.
//
// Deploy with:
//   supabase functions deploy invite-user
//
// Called from the app as:
//   supabase.functions.invoke('invite-user', { body: { email, full_name, role, cohort_id } })

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    // Client scoped to the caller's own JWT — used only to verify who's asking.
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return json({ error: 'Not authenticated' }, 401)
    }

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileErr || callerProfile?.role !== 'admin') {
      return json({ error: 'Only admins can invite users' }, 403)
    }

    const { email, full_name, role, cohort_id } = await req.json()

    if (!email || !full_name || !role) {
      return json({ error: 'email, full_name, and role are required' }, 400)
    }
    if (!['student', 'mentor', 'admin'].includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }

    // Privileged client — only ever used inside this server-side function.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role, cohort_id: cohort_id ?? null },
    })

    if (error) {
      return json({ error: error.message }, 400)
    }

    return json({ user: data.user }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
