import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from './database.types';

// Replace these with your actual Supabase project values
const supabaseUrl = 'https://rowpfjwillhwyqksbpil.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvd3BmandpbGxod3lxa3NicGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NzYxNDYsImV4cCI6MjA2NjE1MjE0Nn0.RA0vdGsW4BPKd52J4Pkab6eV0oiKYTtCDuUDsSK4lUs';

// Use localStorage for web, AsyncStorage for mobile
const storage = Platform.OS === 'web' ? {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
} : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Re-export the Database type for convenience
export type { Database };