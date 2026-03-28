import { useState, useEffect } from 'react';
import { ShoppingCart, Package, DollarSign, BarChart2, Settings, Home, User, LogOut, ShieldCheck, MapPin, ChevronDown, Plus } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';
import { useBranches } from '../../context/BranchContext';

export const Navbar = () => {
  const location = useLocation();
  const { branding } = useBranding();
  const { user, login, logout, isAdmin } = useAuth();
  const { branches, activeBranch, changeBranch, addBranch } = useBranches();
  const [showBranchList, setShowBranchList] = useState(false);

  const handleAdminToggle = () => {
    if (isAdmin) {
      logout();
    } else {
      const pass = prompt("Ingrese contraseña de Administrador:");
      if (pass && !login(pass)) {
        alert("Contraseña incorrecta");
      }
    }
  };

  const handleAddBranch = async () => {
    const name = prompt("Nombre de la nueva sucursal:");
    if (name) {
      const address = prompt("Dirección:");
      await addBranch({ name, address: address || 'PY' });
    }
  };
  
  const navItems = [
    { path: '/', icon: <Home size={20} />, label: 'Inicio' },
    { path: '/pos', icon: <ShoppingCart size={20} />, label: 'Venta' },
    { path: '/inventory', icon: <Package size={20} />, label: 'Stock' },
    { path: '/cashier', icon: <DollarSign size={20} />, label: 'Caja' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/reports', icon: <BarChart2 size={20} />, label: 'Reportes' });
    navItems.push({ path: '/settings', icon: <Settings size={20} />, label: 'Ajustes' });
  }

  return (
    <nav className="nav-container glass">
      <div className="nav-logo desktop-only">
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="Logo" className="logo-img" />
        ) : (
          <div className="logo-placeholder"><Package /></div>
        )}
        <div className="logo-text">
          <span>{branding.businessName}</span>
          <small className="role-tag">{user?.name || 'Usuario'}</small>
        </div>
      </div>

      <div className="branch-selector-wrapper">
        <button className="branch-active glass" onClick={() => setShowBranchList(!showBranchList)}>
          <MapPin size={16} color="var(--primary)" />
          <span className="branch-name-text">{activeBranch?.name || 'Cargando...'}</span>
          <ChevronDown size={14} className={showBranchList ? 'rotate' : ''} />
        </button>
        
        {showBranchList && (
          <div className="branch-dropdown glass animate-slide-up">
            <div className="dropdown-header">Cambiar Sucursal</div>
            {branches.map(b => (
              <button key={b.id} className={`branch-option ${b.id === activeBranch?.id ? 'active' : ''}`} onClick={() => { changeBranch(b); setShowBranchList(false); }}>
                <div className="option-info">
                   <strong>{b.name}</strong>
                   <small>{b.address}</small>
                </div>
                {b.id === activeBranch?.id && <div className="active-dot"></div>}
              </button>
            ))}
            {isAdmin && (
              <button className="add-branch-btn" onClick={handleAddBranch}>
                <Plus size={14} /> Nueva Sucursal
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="nav-user">
        <button className="auth-btn" onClick={handleAdminToggle} title={isAdmin ? "Cerrar sesión Admin" : "Modo Administrador"}>
          {isAdmin ? <LogOut size={20} color="var(--danger)" /> : <ShieldCheck size={20} />}
        </button>
      </div>

      <style>{`
        .nav-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 70px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0 10px;
          z-index: 1000;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        }

        .nav-links {
          display: flex;
          width: 100%;
          justify-content: space-around;
        }

        .nav-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 10px;
          transition: 0.2s;
          padding: 8px;
          border-radius: var(--radius);
        }

        .nav-link.active {
          color: var(--primary);
          background: rgba(99, 102, 241, 0.1);
        }

        .nav-logo {
          display: none;
        }

        @media (min-width: 768px) {
          .nav-container {
            top: 0;
            left: 0;
            width: 240px;
            height: 100vh;
            flex-direction: column;
            justify-content: flex-start;
            padding: 20px 0;
            border-right: 1px solid var(--border);
          }

          .nav-links {
            flex-direction: column;
            width: 100%;
            gap: 10px;
            padding: 20px;
          }

          .nav-link {
            flex-direction: row;
            font-size: 16px;
            gap: 12px;
            width: 100%;
            padding: 12px 16px;
          }

          .nav-logo {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            font-weight: bold;
            font-size: 18px;
            text-align: center;
            padding: 0 10px;
          }

          .logo-img {
            width: 60px;
            height: 60px;
            object-fit: contain;
            border-radius: 50%;
          }
          
          .logo-placeholder {
            width: 60px;
            height: 60px;
            background: var(--primary);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        /* BRANCH SELECTOR STYLES */
        .branch-selector-wrapper {
          position: relative;
          padding: 0 10px;
          margin: 10px 0;
        }

        .branch-active {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 15px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.05);
          color: var(--text-main);
          cursor: pointer;
          transition: 0.3s;
        }

        .branch-active:hover {
          background: rgba(255,255,255,0.1);
          border-color: var(--primary);
        }

        .branch-name-text {
          flex: 1;
          font-weight: 700;
          font-size: 14px;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rotate { transform: rotate(180deg); }

        .branch-dropdown {
          position: absolute;
          top: 100%;
          left: 10px;
          right: 10px;
          margin-top: 8px;
          padding: 8px;
          border-radius: 15px;
          border: 1px solid var(--border);
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          z-index: 1001;
          background: var(--bg-card);
        }

        .dropdown-header {
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .branch-option {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 10px;
          border: none;
          background: none;
          color: var(--text-main);
          cursor: pointer;
          transition: 0.2s;
        }

        .branch-option:hover {
          background: rgba(99, 102, 241, 0.1);
        }

        .branch-option.active {
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
        }

        .option-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .option-info small {
          font-size: 11px;
          opacity: 0.7;
        }

        .active-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary);
        }

        .add-branch-btn {
          width: 100%;
          margin-top: 8px;
          padding: 10px;
          border-radius: 10px;
          border: 1px dashed var(--border);
          background: none;
          color: var(--primary);
          font-weight: bold;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .add-branch-btn:hover {
          background: rgba(99, 102, 241, 0.05);
          border-color: var(--primary);
        }

        @media (max-width: 767px) {
          .branch-selector-wrapper { margin: 0; padding: 0; }
          .branch-active { border: none; background: none; }
          .branch-name-text { display: none; }
          .branch-dropdown { position: fixed; bottom: 80px; left: 10px; right: 10px; top: auto; }
        }
      `}</style>
    </nav>
  );
};
