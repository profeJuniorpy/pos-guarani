import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { useBranches } from '../context/BranchContext';
import { useBranding } from '../context/BrandingContext';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, DollarSign, BarChart2, PlusCircle, ArrowRight } from 'lucide-react';

export const Home = () => {
  const { branding } = useBranding();
  const { activeBranch } = useBranches();
  const [stats, setStats] = useState({ todaySales: 0, totalStock: 0, lowStockCount: 0, transactions: 0 });

  useEffect(() => {
    loadStats();
  }, [activeBranch]);

  const loadStats = async () => {
    if (!activeBranch) return;
    const today = new Date();
    today.setHours(0,0,0,0);
    const todaySales = await db.sales.where('timestamp').above(today).and(s => s.branch_id === activeBranch.id).toArray();
    const totalToday = todaySales.reduce((sum, s) => sum + s.total, 0);
    const branchStock = await db.branch_stock.where('branch_id').equals(activeBranch.id).toArray();
    const products = await db.products.toArray();
    let lowStock = 0;
    branchStock.forEach(bs => {
      const prod = products.find(p => p.id === bs.product_id);
      if (prod && bs.stock <= prod.min_stock) lowStock++;
    });
    setStats({ todaySales: totalToday, totalStock: branchStock.length, lowStockCount: lowStock, transactions: todaySales.length });
  };

  const quickActions = [
    { label: 'Nueva Venta', icon: <ShoppingCart size={24} />, path: '/pos', color: '#6366f1' },
    { label: 'Agregar Producto', icon: <PlusCircle size={24} />, path: '/inventory', color: '#10b981' },
    { label: 'Cerrar Caja', icon: <DollarSign size={24} />, path: '/cashier', color: '#f59e0b' },
    { label: 'Ver Reportes', icon: <BarChart2 size={24} />, path: '/reports', color: '#ef4444' },
  ];

  return (
    <div className="animate-fade">
      <header className="home-header">
        <h1>¡Hola! 👋</h1>
        <p>Bienvenido a {branding.businessName} - <b>{activeBranch?.name || 'Cargando...'}</b></p>
      </header>

      <section className="dashboard-grid">
        <div className="stats-card glass accent-primary">
          <h3>Ventas de Hoy</h3>
          <p className="stat-value">Gs. {stats.todaySales.toLocaleString('es-PY')}</p>
          <span className="stat-label">{stats.transactions} transacciones</span>
        </div>
        <div className="stats-card glass accent-secondary">
          <h3>Productos en Stock</h3>
          <p className="stat-value">{stats.totalStock}</p>
          <span className="stat-label">{stats.lowStockCount} alertas de bajo stock</span>
        </div>
      </section>

      <section className="quick-actions">
        <h3>Acciones Rápidas</h3>
        <div className="actions-grid">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.path} className="action-card glass" style={{ '--accent-color': action.color }}>
              <div className="action-icon" style={{ backgroundColor: action.color }}>{action.icon}</div>
              <span>{action.label}</span>
              <ArrowRight size={16} className="arrow" />
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        .home-header { margin-bottom: 2rem; }
        .home-header h1 { font-size: 2.5rem; }
        .home-header p { color: var(--text-muted); font-size: 1.1rem; }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .stats-card {
          padding: 1.5rem;
          border-radius: var(--radius);
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: bold;
          margin: 10px 0;
          color: var(--primary);
        }

        .stat-label { font-size: 0.9rem; color: var(--text-muted); }

        .quick-actions h3 { margin-bottom: 1rem; }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .action-card {
          padding: 1rem;
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
          color: var(--text-main);
          font-weight: 600;
          transition: transform 0.2s, background 0.2s;
        }

        .action-card:hover { 
          transform: translateY(-4px); 
          background: rgba(255,255,255,0.9);
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .arrow { margin-left: auto; opacity: 0.5; }
      `}</style>
    </div>
  );
};
