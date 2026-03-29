import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL o Key no configurados. Las funciones de nube no estarán activas.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export const toUUID = (id) => {
  if (typeof id === 'number') {
    return '00000000-0000-0000-0000-' + String(id).padStart(12, '0');
  }
  return id;
};
