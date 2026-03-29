import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Search, Trash2, Plus, Minus, CreditCard, DollarSign, ShoppingCart, CheckCircle, Printer, X, Scale, ShoppingBag, Filter, User } from 'lucide-react';
import { useBranches } from '../context/BranchContext';
import { useBranding } from '../context/BrandingContext';
import { supabase, toUUID } from '../utils/supabase';

export const POS = () => {
  const { activeBranch } = useBranches();
  const { branding } = useBranding();
  
  // Data States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  
  // Transaction States
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weightInput, setWeightInput] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientRuc, setClientRuc] = useState('');

  useEffect(() => { 
    if (activeBranch) {
      loadProducts(); 
      loadCategories();
    }
  }, [activeBranch]);

  const loadCategories = async () => {
    try {
      const cats = await db.categories.toArray();
      setCategories(cats);
    } catch (err) {
      console.error("Error cargando categorías:", err);
    }
  };

  const loadProducts = async () => {
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

  const syncWithCloud = async (table, data) => {
    try {
      if (!supabase) return;
      if (table === 'sales') {
        // Asegurar que la sucursal exista en la nube antes de insertar una venta para evitar error de Foreign Key
        if (activeBranch) {
          const { error: branchError } = await supabase.from('branches').upsert([{
             id: toUUID(activeBranch.id),
             name: activeBranch.name
          }]);
          if (branchError) console.warn('Branch sync warning:', branchError);
        }

        const cloudSale = { ...data };
        delete cloudSale.clientName;
        delete cloudSale.clientRuc;

        const { error } = await supabase.from('sales').insert([{
          total: cloudSale.total,
          payment_method: cloudSale.paymentMethod,
          timestamp: cloudSale.timestamp,
          items: cloudSale.items.map(item => ({ ...item, id: toUUID(item.id), category_id: toUUID(item.category_id) })),
          branch_id: toUUID(cloudSale.branch_id)
        }]);
        if (error) throw error;
      } else {
        const payload = { ...data };
        if (payload.id) payload.id = toUUID(payload.id);
        if (payload.branch_id) payload.branch_id = toUUID(payload.branch_id);
        if (payload.product_id) payload.product_id = toUUID(payload.product_id);
        if (payload.category_id) payload.category_id = toUUID(payload.category_id);
        
        // Supabase schema often omits id on join tables
        if (table === 'branch_stock') {
          delete payload.id;
          const { error } = await supabase.from(table).upsert([payload], { onConflict: 'branch_id, product_id' });
          if (error) throw error;
        } else {
          const { error } = await supabase.from(table).upsert([payload]);
          if (error) throw error;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Fallo sincronización Cloud [${table}]:`, err.message);
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert("⚠️ No hay stock disponible en esta sucursal");
      return;
    }

    if (product.unit?.toLowerCase().includes('kg')) {
      setSelectedProduct(product);
      setWeightInput('0');
      setShowWeightModal(true);
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
        receivedAmount: paymentMethod === 'Efectivo' ? Number(receivedAmount) : total,
        change: paymentMethod === 'Efectivo' ? Number(receivedAmount) - total : 0,
        branch_id: activeBranch.id,
        clientName: clientName || 'Consumidor Final',
        clientRuc: clientRuc || 'XXX'
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

      syncWithCloud('sales', saleData);
      setOrderComplete(true);
      setShowPaymentModal(false);
      setShowCartMobile(false);
      loadProducts();
    } catch (err) {
      console.error("Error completando la venta:", err);
    }
  };

  const startNewSale = () => {
    setOrderComplete(false);
    setCart([]);
    setReceivedAmount('');
    setClientName('');
    setClientRuc('');
    setPaymentMethod('Efectivo');
  };

  const handlePrintTicket = () => {
    // Para móviles, la mejor forma sin ser bloqueado es usar un iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const content = `
      <html>
        <head><title>Ticket - San Lucas POS</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 50mm; margin: 0; padding: 2mm; font-size: 10px; color: black; }
          .center { text-align: center; } 
          .hr { border-top: 1px dashed black; margin: 4px 0; }
          h2 { font-size: 14px; margin: 4px 0; }
          p { margin: 2px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .item-name { max-width: 30mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        </style></head>
        <body>
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" style="max-width: 40mm; display: block; margin: 0 auto; margin-bottom: 5px;" />` : ''}
          <h2 class="center">${branding?.businessName || 'SAN LUCAS POS'}</h2>
          ${branding?.address ? `<p class="center">${branding.address}</p>` : ''}
          ${branding?.phone ? `<p class="center">Tel: ${branding.phone}</p>` : ''}
          <p class="center" style="font-size: 8px;">Fec: ${new Date().toLocaleString()}</p>
          <div class="hr"></div>
          <p><b>Cliente:</b> ${clientName || 'Consumidor Final'}</p>
          <p><b>RUC/CI:</b> ${clientRuc || 'XXX'}</p>
          <div class="hr"></div>
          ${cart.map(item => `
            <div class="row">
              <span class="item-name">${item.name} (${item.quantity})</span> 
              <span>${(item.price * item.quantity).toLocaleString()}</span>
            </div>
          `).join('')}
          <div class="hr"></div>
          <div class="row"><b>Total:</b> <b>Gs. ${total.toLocaleString('es-PY')}</b></div>
          <p class="center" style="margin-top:10px;">¡Muchas Gracias!</p>
        </body>
      </html>
    `;

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(content);
    iframe.contentWindow.document.close();

    // Trigger print
    iframe.onload = function() {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      } catch (e) {
        console.error("Print failed", e);
      }
    };
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm));
    const matchCategory = selectedCategory ? (p.category_id === selectedCategory.id || p.category === selectedCategory.name) : true;
    return matchSearch && matchCategory;
  });

  if (orderComplete) {
    return (
      <div className="container-fluid d-flex flex-column align-items-center justify-content-center pt-5 animate-fade">
        <CheckCircle size={80} className="text-success mb-3" />
        <h1 className="fw-bold fs-2 text-dark">Venta Registrada</h1>
        <p className="text-muted text-center max-w-sm">El stock ha sido actualizado localmente y sincronizado con la nube.</p>
        <div className="d-flex flex-column gap-3 mt-4" style={{width: '100%', maxWidth: '300px'}}>
          <button onClick={handlePrintTicket} className="btn btn-outline-dark btn-lg d-flex justify-content-center align-items-center fw-bold">
            <Printer size={20} className="me-2" /> Imprimir Válido
          </button>
          <button onClick={startNewSale} className="btn btn-success btn-lg shadow-sm fw-bold">
            Siguiente Venta
          </button>
        </div>
      </div>
    );
  }

  const isEfectivo = paymentMethod === 'Efectivo';
  const isValidPayment = isEfectivo ? (Number(receivedAmount) >= total) : true;

  return (
    <div className="container-fluid pt-3 animate-fade pos-container no-print position-relative h-100">
      <div className="row h-100 g-3">
        
        {/* LEFT COLUMN: PRODUCTS SECTION */}
        <div className="col-12 col-md-8 col-lg-8 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          
          {/* Search Bar */}
          <div className="input-group mb-3 shadow-sm rounded-pill bg-white overflow-hidden border">
            <span className="input-group-text bg-white border-0 ps-3">
              <Search size={20} className="text-muted" />
            </span>
            <input 
              type="text" 
              className="form-control border-0 bg-white py-2 shadow-none" 
              placeholder="Buscar producto por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <span className="input-group-text bg-white border-0 pe-3 cursor-pointer" onClick={() => setSearchTerm('')}>
                <X size={18} className="text-secondary" style={{cursor: 'pointer'}} />
              </span>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="d-flex overflow-auto gap-2 pb-2 mb-3 px-1 no-scrollbar styling-pills">
            <button 
              className={`btn rounded-pill px-4 fw-bold flex-shrink-0 ${!selectedCategory ? 'btn-success text-white shadow-sm' : 'btn-light border text-muted'}`}
              onClick={() => setSelectedCategory(null)}
            >
              <Filter size={16} className="me-1" /> Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id || cat.name}
                className={`btn rounded-pill px-4 fw-bold flex-shrink-0 ${selectedCategory?.name === cat.name ? 'btn-success text-white shadow-sm' : 'btn-light border text-muted'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="row g-2 g-md-3 overflow-auto pb-5 pb-md-2 pe-1 mb-5" style={{ flex: 1, alignContent: 'flex-start' }}>
            {filteredProducts.map(product => (
              <div key={product.id} className="col-6 col-md-4 col-lg-3">
                <div className="card h-100 border-0 shadow-sm rounded-4 text-center cursor-pointer transition-transform product-card" onClick={() => addToCart(product)}>
                  <div className="card-body p-2 p-md-3 d-flex flex-column position-relative h-100">
                    <span className="badge bg-success bg-opacity-10 text-success fw-bold position-absolute top-0 end-0 m-1 rounded-pill" style={{fontSize:'0.65rem'}}>
                      {product.stock} {product.unit}
                    </span>
                    <h6 className="card-title fw-bold text-dark mt-3 mb-1 text-truncate w-100 px-1" style={{fontSize: '0.8rem'}}>
                      {product.name}
                    </h6>
                    <div className="mt-auto pt-2">
                      <p className="card-text text-success fw-black mb-2" style={{fontSize: '1rem'}}>
                        Gs. {product.price.toLocaleString()}
                      </p>
                      <button className="btn btn-sm btn-success w-100 fw-bold rounded-pill p-1 add-btn d-flex align-items-center justify-content-center" style={{fontSize:'0.75rem'}}>
                        <Plus size={14} className="me-1" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: CART ASIDE (Offcanvas on Mobile, Col on Desktop) */}
        <div className={`col-12 col-md-4 col-lg-4 cart-wrapper ${showCartMobile ? 'mobile-show' : 'mobile-hide'}`}>
          <div className="card h-100 border-0 shadow-sm rounded-4 d-flex flex-column overflow-hidden cart-card mx-auto">
            
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-shrink-0">
              <h5 className="mb-0 fw-bold d-flex align-items-center text-dark">
                <ShoppingCart size={20} className="me-2 text-success" /> 
                Carrito
                <span className="badge bg-success ms-2 rounded-pill">{cart.length}</span>
              </h5>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-danger px-3 rounded-pill fw-bold" onClick={() => setCart([])}>Limpiar</button>
                <button className="btn btn-sm btn-light d-md-none" onClick={() => setShowCartMobile(false)}><X /></button>
              </div>
            </div>

            <div className="card-body overflow-auto p-2 bg-light d-flex flex-column gap-2" style={{ flex: 1 }}>
              {cart.length === 0 ? (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                  <ShoppingBag size={50} className="mb-2" />
                  <span>El carrito está vacío</span>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="bg-white rounded-3 p-2 border shadow-sm d-flex align-items-center">
                  <div className="flex-grow-1 overflow-hidden pe-2">
                    <div className="fw-bold text-truncate" style={{fontSize: '0.9rem'}}>{item.name}</div>
                    <div className="text-success fw-semibold small">Gs. {(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                  
                  <div className="d-flex align-items-center bg-light rounded-pill border p-1" style={{minWidth: '85px'}}>
                    <button className="btn btn-sm btn-white text-dark rounded-circle p-0" style={{width: '24px', height: '24px'}} onClick={() => updateQuantity(item.id, item.unit?.includes('kg') ? -0.1 : -1)}>
                      <Minus size={14} />
                    </button>
                    <span className="mx-1 text-center fw-bold small flex-grow-1" style={{minWidth: '25px'}}>
                      {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(3)}
                    </span>
                    <button className="btn btn-sm btn-white text-dark rounded-circle p-0" style={{width: '24px', height: '24px'}} onClick={() => updateQuantity(item.id, item.unit?.includes('kg') ? 0.1 : 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <button className="btn btn-sm text-danger border-0 ms-1 p-1" onClick={() => updateQuantity(item.id, -item.quantity)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="card-footer bg-white border-top p-3 flex-shrink-0">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted fw-bold">TOTAL</span>
                <span className="fs-3 fw-bold text-success">Gs. {total.toLocaleString()}</span>
              </div>
              <button 
                className="btn btn-success btn-lg w-100 rounded-pill fw-bold py-3 shadow-none" 
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
              >
                Cobrar Ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE TRIGGER CART BUTTON */}
      <div className="d-md-none position-fixed bottom-0 start-0 w-100 p-3 no-print z-3">
        <button 
          className="btn btn-success w-100 rounded-pill py-3 px-4 shadow-lg d-flex justify-content-between align-items-center"
          onClick={() => setShowCartMobile(true)}
        >
          <div className="d-flex align-items-center fw-bold">
            <span className="badge bg-white text-success rounded-pill px-2 py-1 me-2" style={{lineHeight: 1}}>{cart.length}</span>
            Ver Pedido
          </div>
          <span className="fw-bold fs-5">Gs. {total.toLocaleString()}</span>
        </button>
      </div>

      {/* MODALS */}
      {(showWeightModal || showPaymentModal) && <div className="modal-backdrop fade show"></div>}
      
      {/* WEIGHT MODAL */}
      <div className={`modal fade ${showWeightModal ? 'show d-block' : ''}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold text-success d-flex align-items-center">
                <Scale className="me-2" /> Pesar: {selectedProduct?.name}
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowWeightModal(false)}></button>
            </div>
            <div className="modal-body text-center">
              <div className="d-flex align-items-center justify-content-center bg-light border border-2 border-success rounded-4 p-3 mb-4">
                <input 
                  type="number" 
                  className="form-control text-center bg-transparent border-0 fw-bold" 
                  style={{fontSize: '3rem', maxWidth: '60%'}}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  step="0.001"
                  autoFocus
                />
                <span className="fs-2 text-muted fw-bold border-start ps-3 ms-2">kg</span>
              </div>

              <div className="row g-2 mb-3">
                {['+0.100', '+0.250', '+0.500', '+1.000', '0.250', '0.500', '0.750'].map(val => (
                  <div className="col-3" key={val}>
                    <button 
                      className="btn btn-outline-secondary w-100 fw-bold h-100 p-2" 
                      onClick={() => {
                        if (val.startsWith('+')) {
                          setWeightInput((parseFloat(weightInput || 0) + parseFloat(val)).toFixed(3))
                        } else {
                          setWeightInput(parseFloat(val).toFixed(3))
                        }
                      }}
                    >
                      {val.startsWith('+') ? val.replace('+0.', '+').replace('+1.', '+1') + (val.startsWith('+1')?'kg':'g') : val.replace('0.', '')+'g'}
                    </button>
                  </div>
                ))}
                <div className="col-3">
                  <button className="btn btn-danger w-100 fw-bold h-100 p-2" onClick={() => setWeightInput('0')}>Cero</button>
                </div>
              </div>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light rounded-pill px-4 fw-bold" onClick={() => setShowWeightModal(false)}>Cancelar</button>
              <button type="button" className="btn btn-success rounded-pill px-4 fw-bold" onClick={addWeightToCart}>
                Agregar (Gs. {(selectedProduct?.price * parseFloat(weightInput || 0)).toLocaleString()})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      <div className={`modal fade ${showPaymentModal ? 'show d-block' : ''}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header border-0 pb-1">
              <h4 className="modal-title fw-bold text-dark w-100 text-center">Finalizar Venta</h4>
              <button type="button" className="btn-close position-absolute end-0 me-3" onClick={() => setShowPaymentModal(false)}></button>
            </div>
            <div className="modal-body pt-0">
              <div className="bg-success bg-opacity-10 rounded-4 p-3 mb-3 text-center border border-success border-opacity-25 mt-2">
                <span className="text-secondary fw-bold text-uppercase small letter-spacing-1">Total a Pagar</span>
                <div className="fw-bold text-success text-break" style={{ fontSize: '2.5rem', lineHeight: '1.2' }}>Gs. {total.toLocaleString('es-PY')}</div>
              </div>

              <div className="d-flex gap-2 mb-3">
                <button 
                  className={`btn flex-grow-1 p-2 rounded-4 fw-bold d-flex flex-column align-items-center justify-content-center gap-1 ${paymentMethod === 'Efectivo' ? 'btn-success shadow-sm' : 'btn-light border text-muted'}`}
                  onClick={() => setPaymentMethod('Efectivo')}
                >
                  <DollarSign size={20} /> Efectivo
                </button>
                <button 
                  className={`btn flex-grow-1 p-2 rounded-4 fw-bold d-flex flex-column align-items-center justify-content-center gap-1 ${paymentMethod === 'Transferencia' ? 'btn-success shadow-sm' : 'btn-light border text-muted'}`}
                  onClick={() => setPaymentMethod('Transferencia')}
                >
                  <CreditCard size={20} /> Transf.
                </button>
              </div>

              <div className="form-group mb-3 bg-light p-3 rounded-4 border">
                <label className="form-label text-muted fw-bold d-flex align-items-center small mb-2"><User size={14} className="me-1" /> Datos del Cliente (Opc.)</label>
                <input 
                  type="text" 
                  className="form-control mb-2 border-0 shadow-sm" 
                  placeholder="Nombre y Apellido"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
                <input 
                  type="text" 
                  className="form-control border-0 shadow-sm" 
                  placeholder="RUC o Documento"
                  value={clientRuc}
                  onChange={e => setClientRuc(e.target.value)}
                />
              </div>

              {isEfectivo && (
                <div className="form-group mb-4">
                  <label className="form-label text-muted fw-bold">Monto Recibido</label>
                  <div className="input-group input-group-lg shadow-sm border rounded-pill overflow-hidden">
                    <span className="input-group-text bg-white border-0 fw-bold text-muted ps-4">Gs.</span>
                    <input 
                      type="number" 
                      className="form-control border-0 fw-bold" 
                      placeholder="0"
                      value={receivedAmount}
                      onChange={e => setReceivedAmount(e.target.value)}
                    />
                  </div>
                  {(Number(receivedAmount) >= total) && (
                    <div className="alert alert-success mt-3 mb-0 rounded-4 d-flex justify-content-between align-items-center fw-bold">
                      <span>Vuelto a entregar:</span>
                      <span className="fs-4">Gs. {(Number(receivedAmount) - total).toLocaleString()}</span>
                    </div>
                  )}
                  {(Number(receivedAmount) > 0 && Number(receivedAmount) < total) && (
                    <div className="text-danger mt-2 small fw-bold ps-2">Montón insuficiente.</div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer border-0 mt-2">
              <button type="button" className="btn btn-light rounded-pill px-4 fw-bold w-100 mb-2 py-3" onClick={() => setShowPaymentModal(false)}>Atrás</button>
              <button 
                type="button" 
                className="btn btn-success rounded-pill px-4 fw-bold w-100 py-3 shadow-sm fs-5" 
                onClick={handleCompleteSale}
                disabled={!isValidPayment}
              >
                Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Scrolled utilities */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .text-truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; }
        .transition-transform { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        
        .product-card:hover { border-color: #198754 !important; transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important; z-index: 10; }
        .product-card .add-btn { opacity: 0.9; }
        .product-card:hover .add-btn { background: #198754; color: white; opacity: 1; }

        @media (max-width: 767px) {
          .mobile-hide { display: none !important; }
          .mobile-show { 
            display: block !important; 
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
            background: rgba(0,0,0,0.5); z-index: 1050; padding: 20px;
          }
          .mobile-show .cart-card { 
            height: calc(100vh - 40px) !important; max-width: 450px; margin: auto; 
            animation: slideUp 0.3s ease forwards;
          }
          .pos-container { padding-bottom: 90px !important; }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
