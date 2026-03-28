import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/db';

const BrandingContext = createContext();

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    businessName: 'Mi Negocio POS',
    logoUrl: null,
    address: '',
    phone: '',
    theme: 'light'
  });

  useEffect(() => {
    // Load branding from local database
    db.settings.get(1).then(settings => {
      if (settings) {
        setBranding(prev => ({ ...prev, ...settings }));
        if (settings.theme) {
          document.documentElement.setAttribute('data-theme', settings.theme);
        }
      }
    });
  }, []);

  const updateBranding = async (newBranding) => {
    const updated = { ...branding, ...newBranding };
    setBranding(updated);
    await db.settings.put({ id: 1, ...updated });
    
    if (newBranding.theme) {
      document.documentElement.setAttribute('data-theme', newBranding.theme);
    }
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
