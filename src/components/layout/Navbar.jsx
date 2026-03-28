import { useState } from 'react';
import { ShoppingCart, Package, DollarSign, BarChart2, Settings, Home, ShieldCheck, LogOut, MapPin, ChevronDown, Plus, Menu, X } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';
import { useBranches } from '../../context/BranchContext';

export const Navbar = () => {
  const location = useLocation();
  const { branding } = useBranding();
  const { user, login, logout, isAdmin } = useAuth();
  const { branches, activeBranch, changeBranch, addBranch } = useBranches();
  
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
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
    { path: '/', icon: <Home size={18} className="me-2" />, label: 'Inicio' },
    { path: '/pos', icon: <ShoppingCart size={18} className="me-2" />, label: 'Venta' },
    { path: '/inventory', icon: <Package size={18} className="me-2" />, label: 'Stock' },
    { path: '/cashier', icon: <DollarSign size={18} className="me-2" />, label: 'Caja' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/reports', icon: <BarChart2 size={18} className="me-2" />, label: 'Reportes' });
    navItems.push({ path: '/settings', icon: <Settings size={18} className="me-2" />, label: 'Ajustes' });
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top no-print">
      <div className="container-fluid">
        
        {/* Brand */}
        <Link className="navbar-brand d-flex align-items-center fw-bold text-success" to="/">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" width="30" height="30" className="d-inline-block align-text-top me-2 rounded-circle" />
          ) : (
            <Package className="me-2 text-success" />
          )}
          San Lucas <span className="text-dark ms-1">POS</span>
        </Link>
        
        {/* Mobile Toggle */}
        <button 
          className="navbar-toggler border-0" 
          type="button" 
          onClick={() => setIsNavCollapsed(!isNavCollapsed)}
        >
          {isNavCollapsed ? <Menu /> : <X />}
        </button>

        {/* Collapsible Content */}
        <div className={`collapse navbar-collapse ${!isNavCollapsed ? 'show' : ''}`}>
          
          {/* Main Links */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 mt-3 mt-lg-0">
            {navItems.map((item) => (
              <li className="nav-item" key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link fw-semibold px-3 rounded ${location.pathname === item.path ? 'active bg-success bg-opacity-10 text-success' : 'text-dark'}`}
                  onClick={() => setIsNavCollapsed(true)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          
          {/* Right Side Tools */}
          <div className="d-flex align-items-lg-center flex-column flex-lg-row gap-3">
            
            {/* Branch Selector Dropdown */}
            <div className="dropdown">
              <button 
                className="btn btn-outline-secondary d-flex align-items-center justify-content-between w-100 px-3 rounded-pill" 
                type="button" 
                onClick={() => setShowBranchList(!showBranchList)}
              >
                <div className="d-flex align-items-center text-truncate" style={{maxWidth: '150px'}}>
                  <MapPin size={16} className="text-success me-2 flex-shrink-0" />
                  <span className="fw-semibold text-truncate small">
                    {activeBranch?.name || 'Cargando...'}
                  </span>
                </div>
                <ChevronDown size={14} className="ms-2" />
              </button>
              
              <ul className={`dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2 ${showBranchList ? 'show' : ''}`} style={{minWidth: '220px'}}>
                <li><h6 className="dropdown-header">Cambiar Sucursal</h6></li>
                {branches.map(b => (
                  <li key={b.id}>
                    <button 
                      className={`dropdown-item d-flex justify-content-between align-items-center py-2 ${b.id === activeBranch?.id ? 'active bg-success' : ''}`}
                      onClick={() => { changeBranch(b); setShowBranchList(false); setIsNavCollapsed(true); }}
                    >
                      <div>
                        <div className="fw-bold">{b.name}</div>
                        <small className={b.id === activeBranch?.id ? 'text-white-50' : 'text-muted'}>{b.address}</small>
                      </div>
                    </button>
                  </li>
                ))}
                {isAdmin && (
                  <>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-success fw-bold py-2" onClick={() => { handleAddBranch(); setShowBranchList(false); }}>
                        <Plus size={16} className="me-2" /> Nueva Sucursal
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
            
            {/* User Profile / Admin Toggle */}
            <button 
              className={`btn btn-sm rounded-pill fw-bold px-3 d-flex align-items-center justify-content-center ${isAdmin ? 'btn-danger' : 'btn-light border'}`} 
              onClick={() => { handleAdminToggle(); setIsNavCollapsed(true); }}
              title={isAdmin ? "Cerrar sesión Admin" : "Modo Administrador"}
              style={{height: '38px'}}
            >
              {isAdmin ? (
                <><LogOut size={16} className="me-2" /> Admin Activo</>
              ) : (
                <><ShieldCheck size={16} className="me-2 text-success" /> {user?.name || 'Usuario'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
