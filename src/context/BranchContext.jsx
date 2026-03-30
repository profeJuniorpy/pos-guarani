import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/db';
import { supabase, toUUID } from '../utils/supabase';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    const b = await db.branches.toArray();
    if (b.length === 0) {
      // Crear sucursal por defecto si no hay ninguna
      const defaultId = await db.branches.add({ name: 'Casa Central', address: 'Asunción, PY' });
      const defaultBranch = { id: defaultId, name: 'Casa Central', address: 'Asunción, PY' };
      setBranches([defaultBranch]);
      setActiveBranch(defaultBranch);
    } else {
      setBranches(b);
      // Intentar recuperar la última sucursal usada de localStorage
      const lastId = localStorage.getItem('last_branch_id');
      const found = b.find(branch => branch.id === Number(lastId)) || b[0];
      setActiveBranch(found);
    }
    setLoading(false);
  };

  const changeBranch = (branch) => {
    setActiveBranch(branch);
    localStorage.setItem('last_branch_id', branch.id);
  };

  const addBranch = async (branchData) => {
    try {
      const id = await db.branches.add(branchData);
      const newBranch = { id, ...branchData };
      setBranches([...branches, newBranch]);
      
      // Sincronizar con Supabase
      if (supabase) {
        const { error } = await supabase.from('branches').upsert([{ id: toUUID(id), ...branchData }]);
        if (error) console.warn('Error sync adding branch:', error);
      }
      
      return newBranch;
    } catch (err) {
      console.error("Error adding branch:", err);
      throw err;
    }
  };

  const updateBranch = async (id, branchData) => {
    try {
      await db.branches.update(id, branchData);
      setBranches(branches.map(b => b.id === id ? { ...b, ...branchData } : b));
      if (activeBranch?.id === id) setActiveBranch({ ...activeBranch, ...branchData });

      // Sincronizar con Supabase
      if (supabase) {
        const { error } = await supabase.from('branches').upsert([{ id: toUUID(id), ...branchData }]);
        if (error) console.warn('Error sync updating branch:', error);
      }
    } catch (err) {
      console.error("Error updating branch:", err);
      throw err;
    }
  };

  const deleteBranch = async (id) => {
    try {
      // Regla de Integridad Referencial: Verificar Ventas, Stock y Sesiones
      const [salesCount, stockCount, sessionCount] = await Promise.all([
        db.sales.where('branch_id').equals(id).count(),
        db.branch_stock.where('branch_id').equals(id).count(),
        db.cashSessions.where('branch_id').equals(id).count()
      ]);

      if (salesCount > 0 || stockCount > 0 || sessionCount > 0) {
        throw new Error(`🚫 Regla de Integridad: No se puede eliminar la sucursal. 
Existen ${salesCount} ventas, ${stockCount} productos en stock y ${sessionCount} sesiones de caja asociadas.`);
      }

      await db.branches.delete(id);
      setBranches(branches.filter(b => b.id !== id));
      
      // Si era la activa, cambiar a otra
      if (activeBranch?.id === id) {
        const next = branches.find(b => b.id !== id) || null;
        changeBranch(next);
      }

      // Sincronizar con Supabase
      if (supabase) {
        const { error } = await supabase.from('branches').delete().eq('id', toUUID(id));
        if (error) console.warn('Error sync deleting branch:', error);
      }
    } catch (err) {
      console.error("Error deleting branch:", err);
      throw err;
    }
  };

  return (
    <BranchContext.Provider value={{ 
      branches, 
      activeBranch, 
      changeBranch, 
      addBranch, 
      updateBranch, 
      deleteBranch, 
      loading 
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranches = () => useContext(BranchContext);
