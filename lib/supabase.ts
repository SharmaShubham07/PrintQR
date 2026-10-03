import { createClient } from "@supabase/supabase-js";

// Hardcoded fallback credentials for Vercel deployment (mirrors Razorpay approach)
const FALLBACK_SUPABASE_URL = "https://nkkldlkjboyqsqibylyb.supabase.co";
const FALLBACK_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra2xkbGtqYm95cXNxaWJ5bHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODY5NTgsImV4cCI6MjEwNjM2Mjk1OH0.wCf3LtZCas1DWDV_697hQBiadR6EDL23Mval-i6lZuU";
const FALLBACK_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra2xkbGtqYm95cXNxaWJ5bHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4Njk1OCwiZXhwIjoyMTA2MzYyOTU4fQ.rrBmN_6Mv7Ro7ZTyeEGri4idDU13wrf35DG8T5ohjJE";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SERVICE_KEY;

export const isSupabaseConfigured = !supabaseUrl.includes("your-project");

// Client-side Supabase client for realtime subscriptions and anonymous inserts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Admin Supabase client with service role key for bypass RLS and admin tasks
export const getAdminSupabase = () => {
  if (!supabaseServiceKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined. Using anon client.");
    return supabase;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
