import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db } from '../db/db';

export const useSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const sync = async () => {
    if (!isSupabaseConfigured()) return;
    
    setSyncing(true);
    try {
      // 1. Sync Products
      const localProducts = await db.products.toArray();
      const { error: pError } = await supabase.from('products').upsert(localProducts);
      if (pError) throw pError;

      // 2. Sync Sales (simplified)
      const localSales = await db.sales.toArray();
      const { error: sError } = await supabase.from('sales').upsert(localSales);
      if (sError) throw sError;

      setLastSync(new Date());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(sync, 60000); // Try to sync every minute
    sync(); // Initial sync
    return () => clearInterval(interval);
  }, []);

  return { syncing, lastSync, triggerSync: sync };
};
