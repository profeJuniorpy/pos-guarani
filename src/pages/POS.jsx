import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Search, Trash2, Plus, Minus, CreditCard, DollarSign, ArrowLeft, ShoppingCart, CheckCircle, Printer, X, Scale, ShoppingBag } from 'lucide-react';
import { useBranches } from '../context/BranchContext';
import { supabase } from '../utils/supabase';

export const POS = () => {
  const { activeBranch } = useBranches();
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weightInput, setWeightInput] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [orderComplete, setOrderComplete] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);

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

    // Si es por kilo, abrir modal de peso
    if (product.unit?.toLowerCase().includes('kg')) {
      setSelectedProduct(product);
      setWeightInput('0');
      setShowWeightModal(true);
      return;
    }

    // Si es unidad, sumar normal
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

  const addWeightToCart = () => {
    const weight = parseFloat(weightInput);
    if (!weight || weight <= 0) return;

    const existingIndex = cart.findIndex(item => item.id === selectedProduct.id);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += weight;
      setCart(newCart);
    } else {
      setCart([...cart, { ...selectedProduct, quantity: weight }]);
    }
    
    setShowWeightModal(false);
    setSelectedProduct(null);
  };

  const updateQuantity = (id, delta) => {
    setCart(cart ? cart.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const newQty = item.quantity + delta;
        if (newQty > (product?.stock || 9999)) {
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

      await db.sales.add(saleData);
      
      for (const item of cart) {
        const stockEntry = await db.branch_stock.where({ product_id: item.id, branch_id: activeBranch.id }).first();
        if (stockEntry) {
           await db.branch_stock.update(stockEntry.id, {
             stock: stockEntry.stock - item.quantity
           });
           syncWithCloud('branch_stock', { ...stockEntry, stock: stockEntry.stock - item.quantity });
        }
      }

      syncWithCloud(saleData);
      setOrderComplete(true);
      setCart([]);
      setShowPaymentModal(false);
      setShowCartMobile(false);
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
          ${cart.map(item => `
            <div class="row"><span>${item.name} x${item.quantity}</span> <span>${(item.price * item.quantity).toLocaleString()}</span></div>
          `).join('')}
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
          .order-complete { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; border-radius: 30px; border: 1px solid var(--border); padding: 2rem; text-align: center; }
          .complete-actions { display: flex; flex-direction: column; gap: 15px; margin-top: 2rem; width: 100%; max-width: 300px; }
          .print-btn { background: var(--bg-card); border: 1px solid var(--border); padding: 15px; border-radius: 15px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
          .new-order-btn { background: var(--primary); color: white; border: none; padding: 15px; border-radius: 15px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(94,92,230,0.3); }
          @media (min-width: 768px) { .complete-actions { flex-direction: row; max-width: 500px; } .order-complete { padding: 5rem; } }
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
              placeholder="Buscar producto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <X size={20} className="clear-search" onClick={() => setSearchTerm('')} />}
          </div>

          <div className="products-grid">
            {filteredProducts.map(product => (
              <button key={product.id} onClick={() => addToCart(product)} className="product-item glass">
                <div className="p-badge">{product.unit}</div>
                <div className="p-info">
                  <span className="p-name">{product.name}</span>
                  <span className="p-stock">{product.stock} {product.unit} disp.</span>
                </div>
                <span className="p-price">Gs. {product.price.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className={`checkout-aside glass ${showCartMobile ? 'mobile-visible' : ''}`}>
          <div className="cart-header">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} /> 
              <h3>Carrito ({cart.length})</h3>
            </div>
            <button onClick={() => setCart([])} className="clear-btn">Limpiar</button>
            <button className="mobile-only close-cart" onClick={() => setShowCartMobile(false)}><X /></button>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingBag size={48} opacity={0.1} />
                <p>Carrito vacío</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <span className="item-price">
                    {item.quantity} {item.unit} x {item.price.toLocaleString()}
                  </span>
                </div>
                <div className="qty-controls">
                  <button onClick={() => updateQuantity(item.id, item.unit?.includes('kg') ? -0.1 : -1)}><Minus size={14} /></button>
                  <span className="qty-val">{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(3)}</span>
                  <button onClick={() => updateQuantity(item.id, item.unit?.includes('kg') ? 0.1 : 1)}><Plus size={14} /></button>
                </div>
                <button className="remove-item" onClick={() => updateQuantity(item.id, -item.quantity)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="checkout-footer">
            <div className="total-row">
              <span>Total</span>
              <span className="total-amount">Gs. {total.toLocaleString()}</span>
            </div>
            <button 
              className="pay-button" 
              disabled={cart.length === 0}
              onClick={() => setShowPaymentModal(true)}
            >
              Cobrar Ahora
            </button>
          </div>
        </aside>

        {/* MOBILE REVEAL BUTTON */}
        <div className="mobile-cart-bar mobile-only glass" onClick={() => setShowCartMobile(true)}>
          <div className="flex items-center gap-3">
            <div className="cart-count-badge">{cart.length}</div>
            <span className="font-bold">Ver Pedido</span>
          </div>
          <span className="text-xl font-black">Gs. {total.toLocaleString()}</span>
        </div>
      </div>

      {/* WEIGHT MODAL */}
      {showWeightModal && (
        <div className="modal-overlay">
          <div className="modal-content glass weight-modal">
             <div className="modal-header">
               <Scale size={24} color="var(--primary)" />
               <h2>Pesar {selectedProduct?.name}</h2>
               <button onClick={() => setShowWeightModal(false)} className="close-x"><X /></button>
             </div>
             
             <div className="weight-display">
               <input 
                 type="number" 
                 value={weightInput}
                 onChange={(e) => setWeightInput(e.target.value)}
                 step="0.001"
                 autoFocus
               />
               <span className="unit-label">kg</span>
             </div>

             <div className="quick-weight-grid">
                <button onClick={() => setWeightInput((parseFloat(weightInput) + 0.1).toFixed(3))}>+100g</button>
                <button onClick={() => setWeightInput((parseFloat(weightInput) + 0.25).toFixed(3))}>+250g</button>
                <button onClick={() => setWeightInput((parseFloat(weightInput) + 0.5).toFixed(3))}>+500g</button>
                <button onClick={() => setWeightInput((parseFloat(weightInput) + 1).toFixed(3))}>+1kg</button>
                <button onClick={() => setWeightInput('0.250')}>1/4 kg</button>
                <button onClick={() => setWeightInput('0.500')}>1/2 kg</button>
                <button onClick={() => setWeightInput('0.750')}>3/4 kg</button>
                <button onClick={() => setWeightInput('0')} className="clear-w">Cero</button>
             </div>

             <div className="modal-actions-footer full-width">
                <button onClick={() => setShowWeightModal(false)} className="btn-cancel">Cancelar</button>
                <button onClick={addWeightToCart} className="btn-save pay">Agregar Gs. {(selectedProduct?.price * parseFloat(weightInput || 0)).toLocaleString()}</button>
             </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content glass payment-modal">
            <div className="modal-header">
              <h2>Finalizar Venta</h2>
              <button onClick={() => setShowPaymentModal(false)} className="close-x"><X /></button>
            </div>
            
            <div className="payment-summary">
               <div className="sum-row"><span>Total a pagar:</span> <strong>Gs. {total.toLocaleString()}</strong></div>
            </div>

            <div className="payment-detail-list">
              <span className="detail-title">Detalle de la venta:</span>
              <div className="detail-items-scroll">
                {cart.map(item => (
                  <div key={item.id} className="detail-item-row">
                    <span>{item.name} x{item.quantity} {item.unit === 'Kg' ? 'kg' : ''}</span>
                    <span>Gs. {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="payment-options">
               <button className={`pay-option ${paymentMethod === 'Efectivo' ? 'active' : ''}`} onClick={() => setPaymentMethod('Efectivo')}>
                 <DollarSign size={24} /> Efectivo
               </button>
               <button className={`pay-option ${paymentMethod === 'Transferencia' ? 'active' : ''}`} onClick={() => setPaymentMethod('Transferencia')}>
                 <CreditCard size={24} /> Transferencia
               </button>
            </div>

            <div className="modal-actions-footer full-width">
               <button onClick={() => setShowPaymentModal(false)} className="btn-cancel">Atrás</button>
               <button onClick={handleCompleteSale} className="btn-save pay">Confirmar Venta</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pos-container { height: calc(100vh - 90px); padding: 10px; }
        .pos-layout { display: grid; grid-template-columns: 1fr 380px; gap: 15px; height: 100%; position: relative; }
        
        .products-section { display: flex; flex-direction: column; gap: 15px; overflow: hidden; }
        .search-bar { display: flex; align-items: center; padding: 12px 20px; border-radius: 20px; gap: 12px; border: 1px solid var(--border); }
        .search-bar input { background: none; border: none; font-size: 1.1rem; color: var(--text-main); flex: 1; outline: none; }
        .clear-search { cursor: pointer; opacity: 0.5; }
        
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; overflow-y: auto; padding-bottom: 20px; }
        .product-item { padding: 12px; border-radius: 18px; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: 0.2s; border: 1px solid var(--border); position: relative; cursor: pointer; }
        .p-badge { position: absolute; top: 8px; right: 8px; font-size: 9px; background: var(--primary); color: white; padding: 2px 6px; border-radius: 8px; text-transform: uppercase; font-weight: 800; }
        .p-name { font-weight: 700; font-size: 0.95rem; line-height: 1.2; height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .p-stock { font-size: 0.75rem; color: var(--text-muted); }
        .p-price { font-weight: 900; color: var(--primary); font-size: 1.1rem; margin-top: auto; }

        .checkout-aside { display: flex; flex-direction: column; border-radius: 25px; border: 1px solid var(--border); overflow: hidden; background: var(--bg-card); transition: 0.3s; }
        .cart-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .cart-header h3 { font-size: 1.1rem; margin: 0; }
        
        .cart-items { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 8px; }
        .cart-item { padding: 10px; border-radius: 14px; background: rgba(255,255,255,0.05); display: flex; gap: 10px; align-items: center; border: 1px solid var(--border); }
        .item-details { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .item-name { font-weight: 700; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-price { font-size: 0.8rem; color: var(--text-muted); }
        
        .qty-controls { display: flex; align-items: center; gap: 8px; background: var(--bg-main); padding: 3px; border-radius: 10px; }
        .qty-controls button { width: 24px; height: 24px; border-radius: 7px; border: none; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .qty-val { font-weight: 800; font-size: 0.85rem; min-width: 40px; text-align: center; }
        .remove-item { color: var(--danger); padding: 5px; cursor: pointer; background: none; border: none; opacity: 0.5; }

        .checkout-footer { padding: 1.5rem; border-top: 2px solid var(--border); }
        .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .total-amount { font-size: 1.8rem; font-weight: 900; color: var(--primary); }
        .pay-button { width: 100%; padding: 18px; border-radius: 18px; background: var(--primary); color: white; font-weight: 900; font-size: 1.1rem; border: none; cursor: pointer; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3); }

        .mobile-cart-bar { position: fixed; bottom: 65px; left: 10px; right: 10px; padding: 10px 15px; border-radius: 15px; display: flex; justify-content: space-between; align-items: center; z-index: 900; box-shadow: 0 8px 25px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.3); background: var(--primary); color: white; cursor: pointer; }
        .cart-count-badge { background: white; color: var(--primary); width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; }

        /* WEIGHT MODAL STYLES */
        .weight-modal { max-width: 450px !important; }
        .weight-display { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 1.5rem 0; background: var(--bg-main); padding: 20px; border-radius: 20px; border: 2px solid var(--primary); }
        .weight-display input { background: none; border: none; font-size: 3rem; font-weight: 900; color: var(--text-main); width: 180px; text-align: center; outline: none; }
        .unit-label { font-size: 1.5rem; font-weight: 800; color: var(--text-muted); border-left: 2px solid var(--border); padding-left: 15px; }
        
        .quick-weight-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 1.5rem; }
        .quick-weight-grid button { padding: 12px 5px; border-radius: 12px; border: 1px solid var(--border); background: white; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
        .quick-weight-grid button:hover { border-color: var(--primary); color: var(--primary); }
        .clear-w { grid-column: span 4; background: #fff5f5 !important; color: #ff4d4d !important; border-color: #ffd8d8 !important; }

        .payment-summary { padding: 20px; background: rgba(34, 197, 94, 0.1); border-radius: 20px; margin-bottom: 1rem; border: 1px dashed var(--primary); }
        .sum-row { display: flex; justify-content: space-between; align-items: center; }
        .sum-row strong { font-size: 1.8rem; color: var(--primary); }
        
        .payment-detail-list { margin-bottom: 1.5rem; }
        .detail-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 800; margin-bottom: 8px; display: block; }
        .detail-items-scroll { max-height: 120px; overflow-y: auto; background: var(--bg-main); border-radius: 15px; padding: 10px; border: 1px solid var(--border); }
        .detail-item-row { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .detail-item-row:last-child { border: none; }
        
        .payment-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1.5rem; }
        .pay-option { padding: 15px; border-radius: 18px; border: 2px solid var(--border); background: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; font-weight: 700; transition: 0.2s; }
        .pay-option.active { border-color: var(--primary); color: var(--primary); background: rgba(34, 197, 94, 0.05); }

        @media (max-width: 767px) {
          .pos-layout { grid-template-columns: 1fr; }
          .checkout-aside { position: fixed; top: 0; right: -100%; width: 92%; height: 100%; z-index: 1100; border-radius: 0; box-shadow: -10px 0 30px rgba(0,0,0,0.2); transition: 0.3s; pointer-events: none; }
          .checkout-aside.mobile-visible { right: 0; pointer-events: all; }
          .products-grid { padding-bottom: 150px; grid-template-columns: repeat(2, 1fr) !important; gap: 10px; }
          .product-item { display: flex; flex-direction: column; justify-content: space-between; padding: 12px; border-radius: 20px; text-align: left; cursor: pointer; transition: 0.3s; position: relative; overflow: hidden; height: 110px; border: 1px solid var(--border); background: white !important; }
          .product-item:hover { transform: translateY(-5px); border-color: var(--primary); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
          .p-badge { position: absolute; top: 8px; right: 8px; background: rgba(34, 197, 94, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; }
          .p-info { display: flex; flex-direction: column; gap: 4px; }
          .p-name { font-weight: 800; font-size: 0.75rem; color: var(--text-main); line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .p-stock { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
          .p-price { font-weight: 900; font-size: 1rem; color: var(--primary); }
          .pos-container { height: auto; }
        }

        @media (min-width: 768px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};
