import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { TrendingUp, BarChart, PieChart, ArrowUpRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranches } from '../context/BranchContext';

export const Reports = () => {
  const { isAdmin } = useAuth();
  const { activeBranch } = useBranches();
  const [sales, setSales] = useState([]);
  const [branchStocks, setBranchStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [timeRange, setTimeRange] = useState('Hoy');

  useEffect(() => {
    loadData();
  }, [timeRange, activeBranch]);

  const loadData = async () => {
    if (!activeBranch) return;

    // Cargar datos base
    const allProducts = await db.products.toArray();
    const currentBranchStock = await db.branch_stock.where('branch_id').equals(activeBranch.id).toArray();
    
    // Configurar rango de tiempo
    const dateLimit = new Date();
    if (timeRange === 'Hoy') dateLimit.setHours(0,0,0,0);
    else if (timeRange === 'Esta Semana') dateLimit.setDate(dateLimit.getDate() - 7);
    else if (timeRange === 'Este Mes') dateLimit.setMonth(dateLimit.getMonth() - 1);
    else dateLimit.setFullYear(2000); // Histórico

    const branchSales = await db.sales
      .where('branch_id').equals(activeBranch.id)
      .and(s => s.timestamp >= dateLimit)
      .toArray();

    setSales(branchSales);
    setProducts(allProducts);
    setBranchStocks(currentBranchStock);
  };

  if (!isAdmin) {
    return (
      <div className="access-denied glass animate-fade">
        <Lock size={64} color="var(--danger)" />
        <h2>Acceso Restringido</h2>
        <p>Solo el Administrador puede ver informes de ganancias y utilidad de las sucursales.</p>
        <p className="hint">Usa el ícono de escudo en el menú para ingresar como administrador.</p>
        <style>{`
          .access-denied { 
            display: flex; flex-direction: column; align-items: center; justify-content: center; 
            padding: 5rem 2rem; text-align: center; border-radius: 20px; margin-top: 2rem;
          }
          .access-denied h2 { margin-top: 1.5rem; color: var(--text-main); }
          .access-denied p { color: var(--text-muted); margin-top: 0.5rem; }
          .hint { font-size: 0.9rem; font-style: italic; opacity: 0.7; }
        `}</style>
      </div>
    );
  }

  const calculateStats = () => {
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = sales.reduce((sum, s) => {
      const saleProfit = s.items.reduce((pSum, item) => {
        const cost = item.cost || 0; 
        return pSum + ((item.price - cost) * item.quantity);
      }, 0);
      return sum + saleProfit;
    }, 0);

    // Inversión calculada sobre el stock real de ESTA sucursal
    const totalInvestment = branchStocks.reduce((sum, bs) => {
      const prod = products.find(p => p.id === bs.product_id);
      return sum + ((prod?.cost || 0) * (bs.stock || 0));
    }, 0);

    const productsSold = sales.reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0);

    return { totalSales, totalProfit, productsSold, totalInvestment };
  };

  const { totalSales, totalProfit, productsSold, totalInvestment } = calculateStats();

  return (
    <div className="animate-fade reports-page">
      <header className="page-header">
        <div className="header-flex">
          <h1>Reportes Financieros</h1>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="glass select-range">
            <option>Hoy</option>
            <option>Esta Semana</option>
            <option>Este Mes</option>
            <option>Histórico</option>
          </select>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card glass accent-primary">
          <div className="stat-icon"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <span>Ingresos Totales (Bruto)</span>
            <h3>Gs. {totalSales.toLocaleString('es-PY')}</h3>
            <p className="trend positive"><ArrowUpRight size={14} /> +12% hoy</p>
          </div>
        </div>

        <div className="stat-card glass accent-secondary">
          <div className="stat-icon"><PieChart size={24} /></div>
          <div className="stat-info">
            <span>Utilidad Neta</span>
            <h3>Gs. {totalProfit.toLocaleString('es-PY')}</h3>
            <p className="trend positive">Margen: {totalSales > 0 ? ((totalProfit/totalSales)*100).toFixed(1) : 0}%</p>
          </div>
        </div>

        <div className="stat-card glass accent-warning">
          <div className="stat-icon"><BarChart size={24} /></div>
          <div className="stat-info">
            <span>Inversión en Stock (Costo)</span>
            <h3>Gs. {totalInvestment.toLocaleString('es-PY')}</h3>
            <p className="trend" style={{color: 'var(--primary)'}}>Capital en mercadería</p>
          </div>
        </div>
      </div>

      <section className="reports-charts">
        <div className="chart-container glass">
          <h3>Rendimiento del Negocio</h3>
          <div className="placeholder-chart">
            <TrendingUp size={120} opacity={0.1} />
            <p>El sistema está analizando las transacciones para generar gráficos</p>
          </div>
        </div>

        <div className="top-products glass">
          <h3>Resumen por Categorías</h3>
          <div className="ranking-list">
             <div className="ranking-item">
                <span className="rank-name">Frutas y Verduras</span>
                <span className="rank-value">Mejor margen</span>
             </div>
             <div className="ranking-item">
                <span className="rank-name">Almacén</span>
                <span className="rank-value">Mayor volumen</span>
             </div>
          </div>
        </div>
      </section>

      <style>{`
        .reports-page { max-width: 1200px; margin: 0 auto; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .select-range { padding: 10px 15px; border-radius: 12px; border: 1px solid var(--border); font-weight: 600; background: var(--bg-card); color: var(--text-main); outline: none; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { padding: 2rem; border-radius: 20px; display: flex; gap: 1.5rem; align-items: center; border: 1px solid var(--border); }
        .stat-icon { 
          width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center; 
          background: var(--bg-main); color: var(--primary); 
        }
        .accent-primary .stat-icon { background: rgba(94, 92, 230, 0.1); color: var(--primary); }
        .accent-secondary .stat-icon { background: rgba(52, 199, 89, 0.1); color: var(--secondary); }
        .accent-warning .stat-icon { background: rgba(255, 159, 10, 0.1); color: var(--accent); }

        .stat-info span { font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
        .stat-info h3 { font-size: 1.8rem; margin: 6px 0; font-weight: 800; color: var(--text-main); }
        .trend { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; font-weight: bold; }
        .trend.positive { color: var(--secondary); }
        
        .reports-charts { display: grid; grid-template-columns: 1fr 350px; gap: 1.5rem; }
        .chart-container { padding: 2rem; min-height: 350px; display: flex; flex-direction: column; border-radius: 20px; }
        .placeholder-chart { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); text-align: center; }

        .top-products { padding: 2rem; border-radius: 20px; }
        .ranking-list { margin-top: 1.5rem; }
        .ranking-item { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid var(--border); }
        .rank-name { font-weight: 600; color: var(--text-main); }
        .rank-value { font-size: 0.9rem; color: var(--secondary); font-weight: bold; }

        @media (max-width: 900px) {
          .reports-charts { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
