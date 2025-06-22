import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from './database.types';

// Replace these with your actual Supabase project values
const supabaseUrl = 'https://rowpfjwillhwyqksbpil.supabase.co';
const supabaseAnonKey = '7CXMTn3q66S6OkCO7ExvQm8IFB8k0XrQjq7aGOvHIvGWVjle0I+c8sfOloQNRqpfGRsisVxcFqMcILILYnmduA==';

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