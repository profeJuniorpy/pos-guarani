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
    { label: 'Nueva Venta', icon: <ShoppingCart size={24} />, path: '/pos', color: 'var(--primary)' },
    { label: 'Agregar Producto', icon: <PlusCircle size={24} />, path: '/inventory', color: '#16a34a' },
    { label: 'Cerrar Caja', icon: <DollarSign size={24} />, path: '/cashier', color: '#15803d' },
    { label: 'Ver Reportes', icon: <BarChart2 size={24} />, path: '/reports', color: '#166534' },
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
        .home-header { margin-bottom: 1.5rem; }
        .home-header h1 { font-size: 1.8rem; margin: 0; }
        .home-header p { color: var(--text-muted); font-size: 1rem; margin-top: 5px; }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stats-card {
          padding: 1.2rem;
          border-radius: var(--radius);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 5px 0;
          color: var(--primary);
        }

        .stat-label { font-size: 0.85rem; color: var(--text-muted); }

        .quick-actions h3 { margin-bottom: 1rem; font-size: 1.2rem; }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.8rem;
        }

        .action-card {
          padding: 0.8rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          text-decoration: none;
          color: var(--text-main);
          font-size: 0.9rem;
          font-weight: 700;
          transition: 0.2s;
          border: 1px solid var(--border);
        }

        .action-card:hover { 
          transform: translateY(-3px); 
          background: rgba(255,255,255,0.1);
          border-color: var(--primary);
        }

        .action-icon {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 10px rgba(34, 197, 94, 0.2);
        }

        .action-card span {
          line-height: 1.2;
          flex: 1;
        }

        .arrow { opacity: 0.4; }

        @media (max-width: 480px) {
          .actions-grid { grid-template-columns: 1fr 1fr; }
          .home-header h1 { font-size: 1.5rem; }
        }
        
        @media (max-height: 500px) and (min-width: 600px) {
          .dashboard-grid { margin-bottom: 1rem; }
          .actions-grid { grid-template-columns: repeat(4, 1fr); }
          .home-header { margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  );
};
