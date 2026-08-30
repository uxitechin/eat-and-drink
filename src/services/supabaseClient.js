import { createClient } from '@supabase/supabase-js';

const getEnv = (key, fallback = '') => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return fallback;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://fewwhxintgbbdulsxyrw.supabase.co');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZld3doeGludGdiYmR1bHN4eXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNzIxNzYsImV4cCI6MjEwMzY0ODE3Nn0.bBs_CnChz_neQxdcg-5YEP7mTf9YywWoBYnWBuHMU9I');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
