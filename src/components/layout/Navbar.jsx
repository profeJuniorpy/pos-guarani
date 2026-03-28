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
          <small className="role-tag">{isAdmin ? 'Administrador' : (user?.name || 'Usuario')}</small>
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
          height: 55px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0 5px;
          z-index: 1000;
          background: rgba(34, 197, 94, 0.95) !important;
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255,255,255,0.2);
        }

        .nav-link {
          color: #000000 !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          gap: 2px;
          transition: 0.2s;
        }

        .nav-link span {
          font-size: 10px;
          font-weight: 700;
        }

        .nav-link.active {
          color: #ffffff !important;
          background: rgba(0, 0, 0, 0.15);
          border-radius: 12px;
          padding: 4px 10px;
        }

        .nav-logo {
          display: none;
        }

        @media (min-width: 768px) {
          .nav-container {
            top: 0;
            left: 0;
            width: 220px;
            height: 100vh;
            flex-direction: column;
            justify-content: flex-start;
            padding: 20px 0;
            border-right: 1px solid var(--border);
            background: var(--primary) !important;
            border-top: none;
          }

          .nav-link {
            flex-direction: row;
            font-size: 15px;
            gap: 12px;
            width: 100%;
            padding: 10px 16px;
            border-radius: 0;
          }
          
          .nav-link span { font-size: 15px; }

          .nav-logo {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            text-align: center;
            width: 100%;
          }

          .logo-text span {
            font-weight: 900;
            font-size: 15px;
            color: #000000;
          }

          .role-tag {
            background: rgba(0, 0, 0, 0.08);
            color: #000000;
            padding: 2px 8px;
            font-size: 10px;
            border-radius: 6px;
          }

          .logo-img {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid rgba(0,0,0,0.1);
          }
        }

        /* BRANCH SELECTOR STYLES */
        .branch-selector-wrapper {
          position: relative;
          padding: 0 12px;
          margin-bottom: 10px;
          width: 100%;
        }

        .branch-active {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.1);
          color: #000000;
          font-weight: 800;
          cursor: pointer;
        }

        .branch-name-text {
          flex: 1;
          font-weight: 700;
          font-size: 12px;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rotate { transform: rotate(180deg); }

        .branch-dropdown {
          position: absolute;
          top: 100%;
          left: 12px;
          right: 12px;
          margin-top: 5px;
          padding: 5px;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          z-index: 1001;
          background: var(--bg-card);
        }

        .dropdown-header {
          padding: 6px 10px;
          font-size: 9px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .branch-option {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          border: none;
          background: none;
          cursor: pointer;
        }

        .branch-option strong { font-size: 12px; }
        .branch-option small { font-size: 10px; opacity: 0.6; }

        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
        }

        @media (max-width: 767px) {
          .nav-container {
            height: 55px;
            padding: 0 2px;
          }
          .nav-links {
            flex: 1;
            justify-content: space-evenly;
            display: flex;
            align-items: center;
          }
          .nav-link {
            min-width: 45px;
            padding: 0;
          }
          .nav-link svg { width: 18px; height: 18px; }
          .branch-selector-wrapper { 
            width: auto;
            margin: 0;
            padding: 0;
          }
          .branch-active { 
            background: none; 
            border: none; 
            padding: 8px;
          }
          .branch-name-text { display: none; }
          .nav-user { padding-right: 5px; }
          .nav-user svg { width: 18px; height: 18px; }
        }
      `}</style>
    </nav>
  );
};
