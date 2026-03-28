import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create the client if we have the credentials
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Utility to check if Supabase is connected
 */
export const isSupabaseConfigured = () => !!supabase;

/**
 * Example of how to sync a local product to Supabase
 */
export const syncProduct = async (product) => {
  if (!supabase) return { error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('products')
    .upsert(product)
    .select();
    
  return { data, error };
};
