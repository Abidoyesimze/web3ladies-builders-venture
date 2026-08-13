// Admin-only: activate/deactivate a user account. Deactivating bans
// them in Supabase Auth (blocks login, not just a UI-hidden flag) and
// flips is_active in public.users so the UI can filter/display status.
// Holds the service_role key server-side — never expose it to the browser.
//
// Deploy with:
//   supabase functions deploy set-user-active
//
// Called from the app as:
//   supabase.functions.invoke('set-user-active', { body: { user_id, active } })

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
      return json({ error: 'Only admins can change account status' }, 403)
    }

    const { user_id, active } = await req.json()

    if (!user_id || typeof active !== 'boolean') {
      return json({ error: 'user_id and active (boolean) are required' }, 400)
    }
    if (user_id === caller.id) {
      return json({ error: "You can't deactivate your own account" }, 400)
    }

    // Privileged client — only ever used inside this server-side function.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 'none' clears a ban; a long duration blocks sign-in indefinitely
    // until reactivated.
    const { error: banErr } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: active ? 'none' : '876000h',
    })
    if (banErr) {
      return json({ error: banErr.message }, 400)
    }

    const { data, error: updateErr } = await adminClient
      .from('users')
      .update({ is_active: active })
      .eq('id', user_id)
      .select()
      .single()

    if (updateErr) {
      return json({ error: updateErr.message }, 400)
    }

    return json({ user: data }, 200)
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
