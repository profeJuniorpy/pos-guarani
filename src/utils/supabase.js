import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL o Key no configurados. Las funciones de nube no estarán activas.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
