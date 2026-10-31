// The family's own Supabase project. Only the URL and the publishable key are
// here (from .env); they ship inside the app, and row-level security is what
// protects the data. The secret key and the database password never reach it.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
