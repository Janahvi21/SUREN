import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.',
  )
}

let parsedUrl: URL
try {
  parsedUrl = new URL(supabaseUrl)
} catch {
  throw new Error('VITE_SUPABASE_URL must be a valid absolute URL.')
}

if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
  throw new Error('VITE_SUPABASE_URL must use HTTP or HTTPS.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
