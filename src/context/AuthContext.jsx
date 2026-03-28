import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('guarani_user');
    return saved ? JSON.parse(saved) : { role: 'sales', name: 'Vendedor' };
  });

  const login = (password) => {
    // Por defecto: admin123 para el Administrador
    if (password === 'admin123') {
      const newUser = { role: 'admin', name: 'Administrador' };
      setUser(newUser);
      localStorage.setItem('guarani_user', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    const newUser = { role: 'sales', name: 'Vendedor' };
    setUser(newUser);
    localStorage.setItem('guarani_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
