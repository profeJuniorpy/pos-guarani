import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/db';

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
    const id = await db.branches.add(branchData);
    const newBranch = { id, ...branchData };
    setBranches([...branches, newBranch]);
    return newBranch;
  };

  return (
    <BranchContext.Provider value={{ branches, activeBranch, changeBranch, addBranch, loading }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranches = () => useContext(BranchContext);
