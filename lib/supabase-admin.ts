import { createClient } from '@supabase/supabase-js'

// Client server-only con service_role: bypassa RLS.
// USARE SOLO in Server Component / route server, MAI lato client.
// La sicurezza è garantita filtrando sempre per user.id della sessione autenticata.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}