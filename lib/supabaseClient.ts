import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mhejfdtkglnrwjbxbzqe.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZWpmZHRrZ2xucndqYnhienFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDA1MTgsImV4cCI6MjA1OTA3NjUxOH0.sxL7t74O9IdJ21LbS0c752dyG-ZzuxoYmD2N2RyUqhk"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

