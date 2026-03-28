import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Search, Trash2, Plus, Minus, CreditCard, DollarSign, ArrowLeft, ShoppingCart, CheckCircle, Printer, X } from 'lucide-react';
import { useBranches } from '../context/BranchContext';
import { supabase } from '../utils/supabase';

export const POS = () => {
  const { activeBranch } = useBranches();
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [orderComplete, setOrderComplete] = useState(false);

  useEffect(() => { loadProducts(); }, [activeBranch]);

  const loadProducts = async () => {
    if (!activeBranch) return;
    try {
      const p = await db.products.toArray();
      const branchStock = await db.branch_stock.where('branch_id').equals(activeBranch.id).toArray();
      
      const productsWithBranchStock = p.map(prod => {
        const stockEntry = branchStock.find(bs => bs.product_id === prod.id);
        return { ...prod, stock: stockEntry ? stockEntry.stock : 0 };
      });

      setProducts(productsWithBranchStock);
    } catch (err) {
      console.error("Error cargando productos:", err);
    }
  };

  const syncWithCloud = async (saleData) => {
    try {
      if (!supabase) return;
      const { error } = await supabase.from('sales').insert([{
        total: saleData.total,
        payment_method: saleData.paymentMethod,
        timestamp: saleData.timestamp,
        items: saleData.items,
        branch_id: saleData.branch_id
      }]);
      if (error) throw error;
    } catch (err) {
      console.warn('⚠️ Fallo sincronización Cloud:', err.message);
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert("⚠️ No hay stock disponible en esta sucursal");
      return;
    }
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
         alert("⚠️ No puedes vender más de lo que hay en stock");
         return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart ? cart.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const newQty = item.quantity + delta;
        if (newQty > product.stock) {
           alert("⚠️ Stock insuficiente");
           return item;
        }
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0) : []);
  };

  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  }, [cart]);

  const handleCompleteSale = async () => {
    if (cart.length === 0 || !activeBranch) return;
    
    try {
      const saleData = {
        timestamp: new Date(),
        items: [...cart],
        total,
        paymentMethod,
        branch_id: activeBranch.id
      };

      // 1. Guardar Venta
      await db.sales.add(saleData);
      
      // 2. Actualizar Stock Local en la Sucursal Específica
      for (const item of cart) {
        const stockEntry = await db.branch_stock.where({ product_id: item.id, branch_id: activeBranch.id }).first();
        if (stockEntry) {
           await db.branch_stock.update(stockEntry.id, {
             stock: stockEntry.stock - item.quantity
           });
           // Cloud Sync Stock
           syncWithCloud('branch_stock', { ...stockEntry, stock: stockEntry.stock - item.quantity });
        }
      }

      // 3. Sync Sale
      syncWithCloud(saleData);

      setOrderComplete(true);
      setCart([]);
      setShowPaymentModal(false);
      loadProducts();
    } catch (err) {
      console.error("Error completando la venta:", err);
    }
  };

  const handlePrintTicket = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head><title>Ticket - GuaraniPOS</title>
        <style>body { font-family: 'Courier New', monospace; width: 50mm; padding: 5mm; font-size: 10pt; }
        .center { text-align: center; } .hr { border-top: 1px dashed black; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }</style></head>
        <body>
          <h2 class="center">GUARANI POS</h2>
          <p class="center">${new Date().toLocaleString()}</p>
          <div class="hr"></div>
          <div class="row"><b>Total:</b> <b>Gs. ${total.toLocaleString('es-PY')}</b></div>
          <p class="center">¡Muchas Gracias!</p>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body></html>
    `);
    printWindow.document.close();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  if (orderComplete) {
    return (
      <div className="order-complete glass animate-fade">
        <CheckCircle size={100} color="var(--secondary)" />
        <h2 style={{fontSize: '2.5rem', margin: '1rem 0'}}>Venta Registrada</h2>
        <p>El stock ha sido actualizado localmente y sincronizado con la nube.</p>
        <div className="complete-actions">
          <button onClick={handlePrintTicket} className="print-btn"><Printer size={20} /> Imprimir Comprobante</button>
          <button onClick={() => setOrderComplete(false)} className="new-order-btn">Siguiente Venta</button>
        </div>
        <style>{`
          .order-complete { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; border-radius: 30px; border: 1px solid var(--border); padding: 5rem; text-align: center; }
          .complete-actions { display: flex; gap: 20px; margin-top: 3rem; }
          .print-btn { background: var(--bg-card); border: 1px solid var(--border); padding: 15px 30px; border-radius: 15px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px; }
          .new-order-btn { background: var(--primary); color: white; border: none; padding: 15px 40px; border-radius: 15px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(94,92,230,0.3); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="animate-fade pos-container">
      <div className="pos-layout">
        <section className="products-section">
          <div className="search-bar glass">
            <Search size={22} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código de barras..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="products-grid">
            {filteredProducts.map(product => (
              <button key={product.id} onClick={() => addToCart(product)} className="product-item glass">
                <div className="p-info">
                  <span className="p-name">{product.name}</span>
                  <span className="p-stock">{product.stock} {product.unit}s disp.</span>
                </div>
                <span className="p-price">Gs. {product.price.toLocaleString('es-PY')}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="checkout-aside glass">
          <div className="cart-header">
            <h3><ShoppingCart size={20} /> Carrito de Venta</h3>
            <button onClick={() => setCart([])} className="clear-btn">Limpiar</button>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingCart size={64} opacity={0.1} />
                <p>No hay productos seleccionados</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <span className="item-price">Gs. {item.price.toLocaleString()}</span>
                </div>
                <div className="qty-controls">
                  <button onClick={() => updateQuantity(item.id, -1)}><Minus size={16} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)}><Plus size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="checkout-footer">
            <div className="total-row">
              <span style={{fontWeight: 700}}>Total a Cobrar</span>
              <span className="total-amount">Gs. {total.toLocaleString('es-PY')}</span>
            </div>
            <button 
              className="pay-button" 
              disabled={cart.length === 0}
              onClick={() => setShowPaymentModal(true)}
            >
              Confirmar Gs. {total.toLocaleString('es-PY')}
            </button>
          </div>
        </aside>
      </div>

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content glass payment-modal">
            <div className="modal-header">
              <h2>Método de Pago</h2>
              <button onClick={() => setShowPaymentModal(false)} className="close-x"><X size={20} /></button>
            </div>
            
            <div className="payment-options">
               <button 
                 className={`pay-option ${paymentMethod === 'Efectivo' ? 'active' : ''}`}
                 onClick={() => setPaymentMethod('Efectivo')}
               >
                 <DollarSign size={24} /> Efectivo
               </button>
               <button 
                 className={`pay-option ${paymentMethod === 'Transferencia' ? 'active' : ''}`}
                 onClick={() => setPaymentMethod('Transferencia')}
               >
                 <CreditCard size={24} /> Transferencia
               </button>
            </div>

            <div className="modal-actions-footer full-width">
               <button onClick={() => setShowPaymentModal(false)} className="btn-cancel">Cancelar</button>
               <button onClick={handleCompleteSale} className="btn-save pay">Completar Operación</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pos-container { height: calc(100vh - 120px); }
        .pos-layout { display: grid; grid-template-columns: 1fr 420px; gap: 1.5rem; height: 100%; }
        
        .products-section { display: flex; flex-direction: column; gap: 1.5rem; overflow: hidden; }
        .search-bar { display: flex; align-items: center; padding: 20px 30px; border-radius: 25px; gap: 15px; border: 1px solid var(--border); }
        .search-bar input { background: none; border: none; font-size: 1.2rem; color: var(--text-main); flex: 1; outline: none; }
        
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.2rem; overflow-y: auto; padding-bottom: 20px; }
        .product-item { padding: 1.5rem; border-radius: 22px; text-align: left; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: 0.2s; border: 1px solid var(--border); cursor: pointer; }
        .product-item:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .p-name { font-weight: 800; display: block; font-size: 1.1rem; }
        .p-stock { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
        .p-price { font-weight: 900; color: var(--primary); font-size: 1.3rem; }

        .checkout-aside { display: flex; flex-direction: column; border-radius: 30px; border: 1px solid var(--border); overflow: hidden; background: rgba(0,0,0,0.02); }
        .cart-header { padding: 1.5rem 2rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .clear-btn { font-size: 0.85rem; color: var(--danger); font-weight: 800; text-transform: uppercase; cursor: pointer; }
        
        .cart-items { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 12px; }
        .cart-item { padding: 15px; border-radius: 18px; background: white; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .item-details { display: flex; flex-direction: column; }
        .item-name { font-weight: 700; color: var(--text-main); }
        .item-price { font-size: 0.9rem; color: var(--text-muted); }
        
        .qty-controls { display: flex; align-items: center; gap: 15px; background: var(--bg-main); padding: 5px; border-radius: 12px; }
        .qty-controls button { width: 30px; height: 30px; border-radius: 10px; background: white; border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .qty-controls button:hover { border-color: var(--primary); color: var(--primary); }
        .qty-controls span { font-weight: 800; min-width: 20px; text-align: center; }
        
        .checkout-footer { padding: 2rem; background: white; border-top: 2px solid var(--border); }
        .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .total-amount { font-size: 2.2rem; font-weight: 900; color: var(--primary); }
        .pay-button { width: 100%; padding: 22px; border-radius: 22px; background: var(--primary); color: white; font-weight: 900; font-size: 1.25rem; box-shadow: 0 10px 30px rgba(94,92,230,0.4); border: none; cursor: pointer; transition: 0.3s; }
        .pay-button:hover { transform: translateY(-3px); filter: brightness(1.1); }
        .pay-button:disabled { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }
        
        .empty-cart { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); gap: 20px; }

        .payment-options { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 2rem 0; }
        .pay-option { padding: 30px; border-radius: 25px; border: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 12px; font-weight: 800; transition: 0.3s; cursor: pointer; background: white; }
        .pay-option.active { border-color: var(--primary); background: rgba(94,92,230,0.1); color: var(--primary); box-shadow: 0 10px 20px rgba(94,92,230,0.1); }
        .pay-option:hover:not(.active) { border-color: var(--primary); }
        .btn-save.pay { background: var(--secondary) !important; box-shadow: 0 8px 25px rgba(52,199,89,0.3) !important; font-size: 1.1rem; }

        @media (max-width: 1100px) {
          .pos-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
