import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { DollarSign, Clock, CheckCircle, AlertCircle, Printer, MinusCircle, Plus, X, History, Edit2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export const Cashier = () => {
  const [session, setSession] = useState(null);
  const [salesToday, setSalesToday] = useState([]);
  const [movements, setMovements] = useState([]);
  const [initialAmount, setInitialAmount] = useState('');
  const [cashInHand, setCashInHand] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', description: '' });

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    const activeSession = await db.cashSessions.where('status').equals('open').first();
    setSession(activeSession);
    
    if (activeSession) {
      const todaySales = await db.sales
        .where('timestamp')
        .above(activeSession.openTime)
        .toArray();
      setSalesToday(todaySales);

      const sessionMovements = await db.cash_movements
        .where('sessionId')
        .equals(activeSession.id)
        .toArray();
      setMovements(sessionMovements);
    }
  };

  const openRegister = async () => {
    if (!initialAmount) return alert('Ingresa el monto inicial');
    const newSession = {
      openTime: new Date(),
      initialAmount: Number(initialAmount),
      status: 'open',
      totalSales: 0
    };
    await db.cashSessions.add(newSession);
    loadSession();
  };

  const closeRegister = async () => {
    if (!cashInHand) return alert('Ingresa el monto en caja');
    
    const cashSales = salesToday.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.total, 0);
    const totalWithdrawn = movements.reduce((sum, m) => sum + m.amount, 0);
    const expectedCash = session.initialAmount + cashSales - totalWithdrawn;
    
    const difference = Number(cashInHand) - expectedCash;

    await db.cashSessions.update(session.id, {
      closeTime: new Date(),
      status: 'closed',
      totalSales: salesToday.reduce((sum, s) => sum + s.total, 0),
      cashInHand: Number(cashInHand),
      totalWithdrawn,
      difference
    });

    setSession(null);
    alert('Caja cerrada correctamente');
  };

  const closeAllModals = () => {
    setShowWithdrawModal(false);
    setWithdrawForm({ amount: '', description: '' });
  };

  const syncMovementToCloud = async (movement) => {
    try {
       await supabase.from('cash_movements').insert([movement]);
    } catch (err) {
      console.warn('Sync failed', err);
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (!withdrawForm.amount || !withdrawForm.description) return alert('Completa todos los campos');
    
    const movData = {
      sessionId: session.id,
      type: 'withdrawal',
      amount: Number(withdrawForm.amount),
      description: withdrawForm.description,
      timestamp: new Date()
    };

    const id = await db.cash_movements.add(movData);
    syncMovementToCloud({ id, ...movData });
    
    closeAllModals();
    loadSession();
  };

  const handlePrintArqueo = () => {
    const cashSales = salesToday.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.total, 0);
    const totalWithdrawn = movements.reduce((sum, m) => sum + m.amount, 0);
    const expectedCash = session.initialAmount + cashSales - totalWithdrawn;
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Arqueo - GuaraniPOS</title>
          <style>body { font-family: monospace; width: 50mm; padding: 5mm; font-size: 10pt; }
          .row { display: flex; justify-content: space-between; }</style>
        </head>
        <body>
          <h2 style="text-align:center">ARQUEO</h2>
          <div class="row"><span>INICIAL:</span> <span>${session.initialAmount}</span></div>
          <div class="row"><span>VENTAS EF:</span> <span>${cashSales}</span></div>
          <div class="row"><span>RETIROS:</span> <span>-${totalWithdrawn}</span></div>
          <hr>
          <div class="row"><b>TOTAL:</b> <b>${expectedCash}</b></div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body></html>
    `);
    printWindow.document.close();
  };

  const cashSales = salesToday.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.total, 0);
  const totalWithdrawn = movements.reduce((sum, m) => sum + m.amount, 0);
  const totalSales = salesToday.reduce((sum, s) => sum + s.total, 0);
  const expectedCash = session ? (session.initialAmount + cashSales - totalWithdrawn) : 0;

  return (
    <div className="animate-fade cashier-page">
      <header className="page-header">
        <h1>Control de Caja</h1>
        <p>Apertura, cierre y arqueo diario sincronizado.</p>
      </header>

      {!session ? (
        <div className="open-register-card glass">
          <DollarSign size={48} color="var(--primary)" />
          <h2>La caja está cerrada</h2>
          <div className="form-group primary">
            <input type="number" placeholder="Gs. Inicial" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} />
            <button onClick={openRegister} className="open-btn">Abrir Turno</button>
          </div>
        </div>
      ) : (
        <div className="session-dashboard">
          <div className="session-info glass">
            <div className="info-main">
              <h3><Clock size={18} /> Turno Abierto</h3>
              <p>Iniciado: {session.openTime.toLocaleString()}</p>
            </div>
            <div className="header-actions">
              <button onClick={handlePrintArqueo} className="print-report-btn"><Printer size={16} /> Arqueo Parcial</button>
              <button onClick={() => setShowWithdrawModal(true)} className="withdraw-btn"><MinusCircle size={16} /> Retirar Dinero</button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card glass accent-primary">
              <span>Ventas del Turno</span>
              <h3>Gs. {totalSales.toLocaleString()}</h3>
            </div>
            <div className="stat-card glass accent-secondary">
              <span>Efectivo Esperado</span>
              <h3>Gs. {expectedCash.toLocaleString()}</h3>
            </div>
          </div>

          {movements.length > 0 && (
            <div className="movements-section glass">
              <h3>Historial de Retiros (Cloud Sync)</h3>
              <div className="movements-list">
                {movements.map(m => (
                  <div key={m.id} className="movement-item">
                    <div className="mov-info">
                      <span className="mov-desc">{m.description}</span>
                      <small>{m.timestamp.toLocaleTimeString()}</small>
                    </div>
                    <span className="mov-amount">- Gs. {m.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="close-register-section glass">
            <h3>Cierre de Turno</h3>
            <div className="close-form">
              <input type="number" placeholder="Efectivo físico" value={cashInHand} onChange={e => setCashInHand(e.target.value)} />
              <button onClick={closeRegister} className="close-btn">Cerrar Caja</button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="modal-overlay">
          <div className="modal-content glass withdraw-modal-container">
            <div className="modal-header">
              <div className="title-with-icon">
                <MinusCircle size={28} color="var(--danger)" />
                <h2>Nuevo Retiro</h2>
              </div>
              <button onClick={closeAllModals} className="close-x"><X size={24} /></button>
            </div>
            <form onSubmit={handleWithdrawal} className="premium-form">
              <div className="withdrawal-amount-box">
                <label>Monto</label>
                <div className="big-amount-input">
                  <span>Gs.</span>
                  <input type="number" required value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} autoFocus />
                </div>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <div className="input-icon-wrapper">
                  <Edit2 size={18} className="input-icon" />
                  <input type="text" required value={withdrawForm.description} onChange={e => setWithdrawForm({...withdrawForm, description: e.target.value})} />
                </div>
              </div>
              <div className="modal-actions-footer">
                <button type="button" onClick={closeAllModals} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-save danger-glow">Confirmar Retiro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .cashier-page { max-width: 900px; margin: 0 auto; padding-bottom: 50px; }
        .open-register-card { text-align: center; padding: 4rem; border-radius: 25px; border: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 2rem; }
        .open-btn { background: var(--primary); color: white; padding: 15px 40px; border-radius: 15px; font-weight: bold; border: none; cursor: pointer; }
        .session-info { padding: 1.5rem 2rem; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border: 1px solid var(--border); }
        .header-actions { display: flex; gap: 10px; }
        .withdraw-btn { background: rgba(255, 69, 58, 0.1); color: var(--danger); padding: 10px 15px; border-radius: 10px; border: 1px solid var(--danger); font-weight: bold; display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { padding: 2rem; border-radius: 20px; text-align: center; border: 1px solid var(--border); }
        .stat-card h3 { font-size: 2rem; margin: 10px 0; color: var(--primary); }
        .stat-card.accent-secondary h3 { color: var(--secondary); }
        .movements-section { padding: 2rem; border-radius: 20px; border: 1px solid var(--border); margin-bottom: 2rem; }
        .movement-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .mov-amount { color: var(--danger); font-weight: bold; }
        .close-register-section { padding: 3rem; text-align: center; border-radius: 25px; border: 1px solid var(--border); }
        .close-form { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 1rem; }
        .close-btn { background: var(--danger); color: white; padding: 15px; border-radius: 15px; width: 300px; font-weight: bold; border: none; cursor: pointer; }

        .withdraw-modal-container { width: 100%; max-width: 450px; padding: 2.5rem; border-radius: 30px; }
        .withdrawal-amount-box { background: rgba(255, 69, 58, 0.05); padding: 1.5rem; border-radius: 20px; text-align: center; margin-bottom: 20px; }
        .big-amount-input { display: flex; justify-content: center; align-items: center; gap: 10px; }
        .big-amount-input input { background: none; border: none; font-size: 3rem; font-weight: 800; width: 200px; outline: none; }
        .danger-glow { background: var(--danger); color: white; padding: 15px 30px; border-radius: 15px; font-weight: bold; cursor: pointer; border: none; }
        .btn-cancel { background: none; border: none; color: var(--text-muted); font-weight: bold; cursor: pointer; }
        .modal-actions-footer { display: flex; justify-content: flex-end; gap: 15px; margin-top: 2rem; }
      `}</style>
    </div>
  );
};
