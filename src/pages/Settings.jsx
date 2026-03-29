import { useState } from 'react';
import { useBranding } from '../context/BrandingContext';
import { Save, Image as ImageIcon, Sun, Moon, CloudUpload } from 'lucide-react';
import { db } from '../db/db';
import { supabase } from '../utils/supabase';

export const Settings = () => {
  const { branding, updateBranding } = useBranding();
  const [form, setForm] = useState(branding);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const handleForceSync = async () => {
    try {
      if (!window.confirm("¿Forzar subida masiva de tus datos locales a Supabase?")) return;
      setSyncStatus('Sincronizando a la Nube...');
      
      const tables = ['branches', 'categories', 'suppliers', 'products', 'branch_stock'];
      let errorOccurred = false;
      
      for (const table of tables) {
        setSyncStatus(`Subiendo ${table}...`);
        const data = await db[table].toArray();
        if (data.length > 0) {
          const { error } = await supabase.from(table).upsert(data);
          if (error) {
             console.error(`Error en ${table}:`, error);
             errorOccurred = true;
             alert(`Fallo en ${table}: ` + error.message);
          }
        }
      }
      setSyncStatus(errorOccurred ? 'Sincronización completada con ⚠️errores' : 'Sincronización Total Exitosa ✅');
      setTimeout(()=>setSyncStatus(null), 5000);
    } catch(err) {
      console.error(err);
      setSyncStatus('Error crítico ❌');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, logoUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await updateBranding(form);
    setIsSaving(false);
    alert('Ajustes guardados correctamente');
  };

  return (
    <div className="animate-fade">
      <header className="page-header">
        <h1>Ajustes del Sistema</h1>
        <p>Configura la identidad de tu negocio y preferencias.</p>
      </header>

      <form onSubmit={handleSave} className="settings-form">
        <section className="settings-section glass">
          <h3>Identidad del Negocio</h3>
          
          <div className="logo-upload">
            <div className="logo-preview">
              {form.logoUrl ? <img src={form.logoUrl} alt="Logo preview" /> : <ImageIcon size={40} />}
            </div>
            <label className="upload-btn">
              Seleccionar Logo
              <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="form-group">
            <label>Nombre del Negocio</label>
            <input 
              type="text" 
              value={form.businessName} 
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="Ej: Frutería 'La Excelencia'"
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Dirección</label>
              <input 
                type="text" 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Calle Principal 123"
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input 
                type="text" 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0981 123 456"
              />
            </div>
          </div>
        </section>

        <section className="settings-section glass">
          <h3>Preferencias Visuales</h3>
          <div className="theme-toggle">
            <button 
              type="button"
              className={form.theme === 'light' ? 'active' : ''} 
              onClick={() => setForm({ ...form, theme: 'light' })}
            >
              <Sun size={20} /> Light
            </button>
            <button 
              type="button"
              className={form.theme === 'dark' ? 'active' : ''} 
              onClick={() => setForm({ ...form, theme: 'dark' })}
            >
              <Moon size={20} /> Dark
            </button>
          </div>
        </section>

        <section className="settings-section glass danger-zone">
          <h3>Administración Avanzada</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Utiliza esta herramienta si vaciaste tu base de datos de la nube Supabase y necesitas que vuelva a reflejar la información que tienes aquí.</p>
          <button 
            type="button" 
            className="sync-btn" 
            onClick={handleForceSync}
            disabled={syncStatus !== null}
          >
            <CloudUpload size={20} />
            {syncStatus || 'Forzar Sincronización Masiva a la Nube'}
          </button>
        </section>

        <button type="submit" className="save-btn" disabled={isSaving}>
          <Save size={20} />
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>

      <style>{`
        .page-header { margin-bottom: 2rem; }
        .page-header h1 { font-size: 2rem; color: var(--primary); }
        .page-header p { color: var(--text-muted); }

        .settings-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .settings-section { 
          padding: 1.5rem; 
          border-radius: var(--radius);
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .logo-upload {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .logo-preview {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--bg-main);
          border: 2px dashed var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .logo-preview img { width: 100%; height: 100%; object-fit: cover; }

        .upload-btn {
          background: var(--primary);
          color: white;
          padding: 8px 16px;
          border-radius: var(--radius);
          cursor: pointer;
          font-size: 14px;
        }

        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-weight: 600; font-size: 14px; }
        .form-group input {
          padding: 12px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-main);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .theme-toggle {
          display: flex;
          gap: 10px;
        }

        .theme-toggle button {
          flex: 1;
          padding: 12px;
          border-radius: var(--radius);
          background: var(--bg-main);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }

        .theme-toggle button.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .sync-btn {
          background: #4ade80;
          color: #064e3b;
          padding: 14px;
          border-radius: var(--radius);
          font-weight: 600;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid #22c55e;
        }
        
        .sync-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .save-btn {
          background: var(--secondary);
          color: white;
          padding: 14px;
          border-radius: var(--radius);
          font-weight: bold;
          font-size: 16px;
          margin-top: 1rem;
        }

        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
