import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ✅ Replace these with your own values
const supabaseUrl = 'https://bvocjeutlfubaelywlqi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2b2NqZXV0bGZ1YmFlbHl3bHFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NzkzOTcsImV4cCI6MjA2NTM1NTM5N30.dNfoD1kpUPHHMS00mXDk36oajjB-9Uormt76y0M2xTc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
