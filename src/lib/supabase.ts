import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client if environment variables are missing
let supabaseClient: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
    supabaseClient = null;
  }
} else {
  console.warn('Supabase environment variables not found. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  // Create a mock client to prevent errors
  supabaseClient = {
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          gt: () => ({ count: 0, error: new Error('Supabase not configured') }),
          order: () => ({ data: [], error: new Error('Supabase not configured') })
        }),
        order: () => ({ data: [], error: new Error('Supabase not configured') })
      }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: new Error('Supabase not configured') }) }) }),
      update: () => ({ eq: () => ({ data: null, error: new Error('Supabase not configured') }) }),
      delete: () => ({ eq: () => ({ data: null, error: new Error('Supabase not configured') }) })
    })
  };
}

export const supabase = supabaseClient;