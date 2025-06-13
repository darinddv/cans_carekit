import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Replace these with your actual Supabase project values
const supabaseUrl = 'https://bvocjeutlfubaelywlqi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2b2NqZXV0bGZ1YmFlbHl3bHFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NzkzOTcsImV4cCI6MjA2NTM1NTM5N30.dNfoD1kpUPHHMS00mXDk36oajjB-9Uormt76y0M2xTc';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      care_tasks: {
        Row: {
          id: string;
          title: string;
          time: string;
          completed: boolean;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          time: string;
          completed?: boolean;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          time?: string;
          completed?: boolean;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};