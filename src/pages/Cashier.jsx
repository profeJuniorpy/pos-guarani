import { useState, useEffect } from 'react';
import { useBranches } from '../context/BranchContext';
import { supabase } from '../utils/supabase';
import { db } from '../db/db';
import { Package, Clock, Printer, MinusCircle, DollarSign, X, Edit2 } from 'lucide-react';

export const Cashier = () => {
  const { activeBranch } = useBranches();
  const [session, setSession] = useState(null);
  const [salesToday, setSalesToday] = useState([]);
  const [movements, setMovements] = useState([]);
  const [initialAmount, setInitialAmount] = useState('');
  const [cashInHand, setCashInHand] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', description: '' });

  useEffect(() => {
    loadSession();
  }, [activeBranch]);

  const loadSession = async () => {
    if (!activeBranch) return;
    const activeSession = await db.cashSessions
      .where({ status: 'open', branch_id: activeBranch.id })
      .first();
    
    setSession(activeSession);
    
    if (activeSession) {
      const todaySales = await db.sales
        .where('timestamp')
        .above(activeSession.openTime)
        .and(s => s.branch_id === activeBranch.id)
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
    if (!initialAmount || !activeBranch) return alert('Ingresa el monto inicial');
    const newSession = {
      openTime: new Date(),
      initialAmount: Number(initialAmount),
      status: 'open',
      totalSales: 0,
      branch_id: activeBranch.id
    };
    await db.cashSessions.add(newSession);
    loadSession();
  };

  const closeRegister = async () => {
    if (!cashInHand) return alert('Ingresa el monto en caja');
    
    const cashSales = salesToday.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.total, 0);
    const totalWithdrawn = movements.reduce((sum, m) => sum + m.amount, 0);
    const expected = session.initialAmount + cashSales - totalWithdrawn;

    const updatedSession = {
      ...session,
      closeTime: new Date(),
      status: 'closed',
      finalAmount: Number(cashInHand),
      expectedAmount: expected,
      difference: Number(cashInHand) - expected
    };

    await db.cashSessions.put(updatedSession);
    
    // Sync to Supabase
    try {
      await supabase.from('cash_sessions').upsert([{
        ...updatedSession,
        openTime: updatedSession.openTime.toISOString(),
        closeTime: updatedSession.closeTime.toISOString()
      }]);
    } catch (e) {
      console.error("Cloud sync failed", e);
    }

    setSession(null);
    setInitialAmount('');
    setCashInHand('');
    alert('Caja cerrada con éxito');
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (!withdrawForm.amount || !session) return;

    const newMovement = {
      sessionId: session.id,
      amount: Number(withdrawForm.amount),
      description: withdrawForm.description,
      timestamp: new Date(),
      branch_id: activeBranch.id
    };

    await db.cash_movements.add(newMovement);
    
    // Sync to Supabase
    try {
      await supabase.from('cash_movements').insert([{
        ...newMovement,
        timestamp: newMovement.timestamp.toISOString()
      }]);
    } catch (e) {
      console.error("Cloud sync failed", e);
    }

    setWithdrawForm({ amount: '', description: '' });
    setShowWithdrawModal(false);
    loadSession();
  };

  const handlePrintArqueo = () => {
    window.print();
  };

  const closeAllModals = () => {
    setShowWithdrawModal(false);
  };

  // Calculations
  const cashSales = salesToday.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.total, 0);
  const totalWithdrawn = movements.reduce((sum, m) => sum + m.amount, 0);
  const totalSales = salesToday.reduce((sum, s) => sum + s.total, 0);
  const expectedCash = session ? (session.initialAmount + cashSales - totalWithdrawn) : 0;

  if (!activeBranch) return <div className="p-10 text-center">Por favor selecciona una sucursal</div>;

  return (
    <div className="cashier-page p-6">
      <div className="page-header mb-8">
        <h1>Gestión de Caja</h1>
        <p className="subtitle">Sucursal: {activeBranch.name}</p>
      </div>

      {!session ? (
        <div className="open-register-card glass glass-hover p-10">
          <DollarSign size={48} color="var(--primary)" />
          <h2>La caja está cerrada</h2>
          <p className="mb-6 opacity-70">Abre el turno para empezar a registrar ventas</p>
          <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
            <input 
              type="number" 
              className="premium-input text-center text-xl"
              placeholder="Gs. Monto Inicial" 
              value={initialAmount} 
              onChange={e => setInitialAmount(e.target.value)} 
            />
            <button onClick={openRegister} className="btn-primary w-full py-4 text-lg">Abrir Turno</button>
          </div>
        </div>
      ) : (
        <div className="session-dashboard animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="session-info glass p-6 mb-8 flex justify-between items-center rounded-2xl border border-white/10">
            <div className="info-main flex items-center gap-4">
              <div className="icon-circle bg-primary/20 text-primary p-3 rounded-full">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Turno Abierto</h3>
                <p className="opacity-70">Iniciado: {new Date(session.openTime).toLocaleString()}</p>
              </div>
            </div>
            <div className="header-actions flex gap-3">
              <button onClick={handlePrintArqueo} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                <Printer size={18} /> Arqueo Parcial
              </button>
              <button onClick={() => setShowWithdrawModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/20">
                <MinusCircle size={18} /> Retirar Dinero
              </button>
            </div>
          </div>

          <div className="stats-grid grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="stat-card glass p-8 rounded-3xl border border-white/5 text-center">
              <span className="text-muted-foreground uppercase text-xs tracking-widest font-bold">Ventas del Turno</span>
              <h3 className="text-4xl font-black mt-2 text-primary">Gs. {totalSales.toLocaleString()}</h3>
            </div>
            <div className="stat-card glass p-8 rounded-3xl border border-white/5 text-center">
              <span className="text-muted-foreground uppercase text-xs tracking-widest font-bold">Efectivo Esperado</span>
              <h3 className="text-4xl font-black mt-2 text-secondary">Gs. {expectedCash.toLocaleString()}</h3>
            </div>
          </div>

          {movements.length > 0 && (
            <div className="movements-section glass p-6 rounded-3xl mb-8 border border-white/5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 italic opacity-80">
                <MinusCircle size={18} className="text-red-500" /> Historial de Retiros
              </h3>
              <div className="movements-list divide-y divide-white/5">
                {movements.map(m => (
                  <div key={m.id} className="movement-item flex justify-between items-center py-4">
                    <div className="mov-info">
                      <span className="mov-desc font-medium">{m.description}</span>
                      <small className="block opacity-50">{new Date(m.timestamp).toLocaleTimeString()}</small>
                    </div>
                    <span className="mov-amount text-red-500 font-black">- Gs. {m.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="close-register-section glass p-8 rounded-3xl text-center border-t-4 border-red-500/50 shadow-2xl shadow-red-500/5">
            <h3 className="text-2xl font-black mb-4">Cierre de Turno</h3>
            <p className="mb-6 opacity-70">Cuenta el efectivo físico disponible en caja antes de cerrar</p>
            <div className="close-form flex flex-col md:flex-row gap-4 justify-center items-center">
              <input 
                type="number" 
                className="premium-input text-center text-xl w-full max-w-xs"
                placeholder="Efectivo físico real" 
                value={cashInHand} 
                onChange={e => setCashInHand(e.target.value)} 
              />
              <button onClick={closeRegister} className="btn-danger py-4 px-10 text-lg font-bold rounded-2xl shadow-lg shadow-red-500/20">
                Cerrar Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="modal-overlay fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="modal-content glass p-8 rounded-[40px] w-full max-w-md border border-white/10 shadow-2xl">
            <div className="modal-header flex justify-between items-center mb-8">
              <div className="title-with-icon flex items-center gap-3">
                <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                  <MinusCircle size={28} />
                </div>
                <h2 className="text-2xl font-black">Nuevo Retiro</h2>
              </div>
              <button onClick={closeAllModals} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleWithdrawal} className="space-y-6">
              <div className="withdrawal-amount-box bg-red-500/5 p-6 rounded-3xl text-center border border-red-500/10">
                <label className="text-xs font-bold uppercase tracking-tighter opacity-50">Monto del Retiro</label>
                <div className="big-amount-input flex items-center justify-center gap-2 mt-2">
                  <span className="text-2xl font-black opacity-30">Gs.</span>
                  <input 
                    type="number" 
                    required 
                    className="bg-transparent border-none text-4xl font-black w-full text-center focus:ring-0"
                    placeholder="0"
                    value={withdrawForm.amount} 
                    onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} 
                    autoFocus 
                  />
                </div>
              </div>
              <div className="form-group space-y-2">
                <label className="text-sm font-bold opacity-70">¿Para qué es este retiro?</label>
                <div className="relative">
                  <Edit2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                  <input 
                    type="text" 
                    required 
                    className="premium-input pl-12"
                    placeholder="Ej: Pago a proveedor, Viáticos..."
                    value={withdrawForm.description} 
                    onChange={e => setWithdrawForm({...withdrawForm, description: e.target.value})} 
                  />
                </div>
              </div>
              <div className="modal-actions-footer flex gap-4 pt-4">
                <button type="button" onClick={closeAllModals} className="flex-1 py-4 font-bold opacity-50 hover:opacity-100 transition-opacity">Cancelar</button>
                <button type="submit" className="flex-1 btn-danger py-4 rounded-2xl font-black shadow-lg shadow-red-500/20">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
