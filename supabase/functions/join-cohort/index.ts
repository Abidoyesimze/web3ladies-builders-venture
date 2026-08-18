// Public, unauthenticated self-serve join via a cohort invite link.
// Holds the service_role key server-side — never expose this key to
// the browser. Public signup stays disabled at the project level;
// this function is the only path that can create an account, and
// only after validating the token server-side.
//
// Deploy with:
//   supabase functions deploy join-cohort
//
// (the client SDK always sends the project's anon key as the bearer
// token even for logged-out callers, so default JWT verification is
// fine here — no --no-verify-jwt needed.)
//
// Called from the app as:
//   supabase.functions.invoke('join-cohort', { body: { token, email, full_name, password } })

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
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
    const { token, email, full_name, password } = await req.json()

    if (!token || !email || !full_name || !password) {
      return json({ error: 'token, email, full_name, and password are required' }, 400)
    }

    // Privileged client — only ever used inside this server-side function.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: link, error: linkErr } = await adminClient
      .from('cohort_invite_links')
      .select('id, cohort_id, expires_at, max_uses, use_count, revoked')
      .eq('token', token)
      .maybeSingle()

    if (linkErr) {
      return json({ error: linkErr.message }, 500)
    }
    if (
      !link ||
      link.revoked ||
      new Date(link.expires_at).getTime() < Date.now() ||
      (link.max_uses !== null && link.use_count >= link.max_uses)
    ) {
      return json({ error: 'This invite link is no longer valid' }, 400)
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'student', cohort_id: link.cohort_id },
    })

    if (error) {
      return json({ error: error.message }, 400)
    }

    // They set their own password right here — no separate "accept"
    // step like the admin-invite flow, so they're immediately active
    // rather than sitting in a Pending state.
    await adminClient
      .from('users')
      .update({ invite_accepted_at: new Date().toISOString() })
      .eq('id', data.user.id)

    await adminClient
      .from('cohort_invite_links')
      .update({ use_count: link.use_count + 1 })
      .eq('id', link.id)

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
