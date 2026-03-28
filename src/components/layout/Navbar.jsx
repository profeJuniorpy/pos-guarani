import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Package, DollarSign, BarChart2, Settings, Home, User, LogOut, ShieldCheck } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const location = useLocation();
  const { branding } = useBranding();
  const { user, login, logout, isAdmin } = useAuth();

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
      `}</style>
    </nav>
  );
};
