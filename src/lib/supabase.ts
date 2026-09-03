import { createClient } from '@supabase/supabase-js'

// Left untyped for now — src/types/database.ts has the hand-written row
// shapes to annotate query results with, but wiring them into the client's
// generic requires the full GenericSchema shape (Views/Functions/Enums/
// Relationships) that `supabase gen types` produces. Swap this for
// `createClient<Database>(...)` once you generate real types from your
// project (see README).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your project values.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
