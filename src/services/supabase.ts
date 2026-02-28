/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sgohcldloelrehceeppi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2hjbGRsb2VscmVoY2VlcHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNjE5MzUsImV4cCI6MjA4NzgzNzkzNX0.hVtm2xWSnoGh-ci-AqHsmmzRtAysK9gIrucyAo0lb54';

// Create the client with the provided credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = true; // Always true now as we have defaults
