import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Plus, Search, Edit2, Trash2, Camera, Package, AlertCircle, ShoppingBag, FolderRoot, Truck, X } from 'lucide-react';
import { BarcodeScanner } from '../components/pos/BarcodeScanner';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

export const Inventory = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(null); // 'product', 'category', 'supplier'
  const [showScanner, setShowScanner] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Data States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Form States
  const [productForm, setProductForm] = useState({ name: '', barcode: '', price: 0, cost: 0, stock: 0, min_stock: 5, category_id: '', unit: 'Unidad' });
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [p, c, s] = await Promise.all([
      db.products.toArray(),
      db.categories.toArray(),
      db.suppliers.toArray()
    ]);
    setProducts(p);
    setCategories(c);
    setSuppliers(s);
  };

  const syncToCloud = async (table, data) => {
    try {
      const { error } = await supabase.from(table).upsert([data]);
      if (error) throw error;
      console.log(`✅ ${table} sincronizado`);
    } catch (err) {
      console.warn(`❌ No se pudo sincronizar ${table}:`, err.message);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const data = { ...productForm, price: Number(productForm.price), cost: Number(productForm.cost), stock: Number(productForm.stock), min_stock: Number(productForm.min_stock) };
    
    let id;
    if (editingItem) {
      id = editingItem.id;
      await db.products.update(id, data);
    } else {
      id = await db.products.add(data);
    }
    
    syncToCloud('products', { id, ...data });
    closeAllModals();
    loadData();
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    let id;
    if (editingItem) {
      id = editingItem.id;
      await db.categories.update(id, categoryForm);
    } else {
      id = await db.categories.add(categoryForm);
    }
    
    syncToCloud('categories', { id, ...categoryForm });
    closeAllModals();
    loadData();
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    let id;
    if (editingItem) {
      id = editingItem.id;
      await db.suppliers.update(id, supplierForm);
    } else {
      id = await db.suppliers.add(supplierForm);
    }
    
    syncToCloud('suppliers', { id, ...supplierForm });
    closeAllModals();
    loadData();
  };

  const handleDelete = async (table, id) => {
    if (confirm(`¿Estás seguro de eliminar este registro?`)) {
      await db[table].delete(id);
      // Opcional: Eliminar también en Supabase
      await supabase.from(table).delete().eq('id', id);
      loadData();
    }
  };

  const closeAllModals = () => {
    setShowModal(null);
    setEditingItem(null);
    setProductForm({ name: '', barcode: '', price: 0, cost: 0, stock: 0, min_stock: 5, category_id: '', unit: 'Unidad' });
    setCategoryForm({ name: '' });
    setSupplierForm({ name: '', phone: '', email: '' });
  };

  const handlePrintList = () => {
    const totalInventoryCost = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const totalPotentialProfit = products.reduce((sum, p) => sum + ((p.price - p.cost) * p.stock), 0);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Inventario - GuaraniPOS</title>
        <style>body { font-family: sans-serif; padding: 20px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f4f4f4; }
        .footer { margin-top: 20px; padding: 15px; background: #eee; font-weight: bold; border-radius: 8px; }</style></head>
        <body><h1>Informe de Inventario</h1><p>Fecha: ${new Date().toLocaleString()}</p>
        <table><thead><tr><th>Producto</th><th>Stock</th><th>Precio</th>${isAdmin ? '<th>Costo</th>' : ''}</tr></thead>
        <tbody>${products.map(p => `<tr><td>${p.name}</td><td>${p.stock} ${p.unit}</td><td>Gs. ${p.price.toLocaleString()}</td>${isAdmin ? `<td>Gs. ${p.cost.toLocaleString()}</td>` : ''}</tr>`).join('')}</tbody></table>
        ${isAdmin ? `<div class="footer">VALOR INVENTARIO: Gs. ${totalInventoryCost.toLocaleString()}<br>UTILIDAD POTENCIAL: Gs. ${totalPotentialProfit.toLocaleString()}</div>` : ''}
        </body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const handleSyncAll = async () => {
    if (!confirm('¿Deseas subir todo tu inventario actual a la nube de Supabase?')) return;
    
    try {
      alert('Sincronizando... por favor espera.');
      
      // Sincronizar Categorías
      if (categories.length > 0) {
        await supabase.from('categories').upsert(categories.map(c => ({ id: c.id, name: c.name })));
      }

      // Sincronizar Proveedores
      if (suppliers.length > 0) {
        await supabase.from('suppliers').upsert(suppliers.map(s => ({ id: s.id, name: s.name, phone: s.phone, email: s.email })));
      }

      // Sincronizar Productos
      if (products.length > 0) {
        await supabase.from('products').upsert(products);
      }

      alert('✅ ¡Sincronización masiva completada con éxito!');
    } catch (err) {
      console.error('Error en sincronización masiva:', err);
      alert('❌ Error al sincronizar. Revisa tu conexión.');
    }
  };

  return (
    <div className="animate-fade inventory-page">
      <header className="page-header">
        <div className="header-title">
          <h1>Gestión de Inventario</h1>
          <div className="header-actions">
            <button onClick={handleSyncAll} className="sync-cloud-btn">Sincronizar Nube</button>
            <button onClick={handlePrintList} className="secondary-btn">Imprimir Informe</button>
            <button onClick={() => setShowModal(activeTab === 'products' ? 'product' : activeTab === 'categories' ? 'category' : 'supplier')} className="add-btn">
              <Plus size={20} /> Nuevo {activeTab === 'products' ? 'Producto' : activeTab === 'categories' ? 'Categoría' : 'Proveedor'}
            </button>
          </div>
        </div>

        <div className="inventory-tabs glass">
          <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}><ShoppingBag size={18} /> Productos</button>
          <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}><FolderRoot size={18} /> Categorías</button>
          <button className={activeTab === 'suppliers' ? 'active' : ''} onClick={() => setActiveTab('suppliers')}><Truck size={18} /> Proveedores</button>
        </div>
        
        <div className="search-bar glass">
          <Search size={20} />
          <input type="text" placeholder={`Buscar en ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </header>

      {/* VIEW: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="inventory-grid">
          {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
            <div key={product.id} className={`inventory-card glass ${product.stock <= product.min_stock ? 'critical' : ''}`}>
              <div className="card-main">
                <div className="badge-cat">{categories.find(c => c.id === Number(product.category_id))?.name || 'Gral'}</div>
                <h3>{product.name}</h3>
                <p className="sku">{product.barcode || 'Sin SKU'}</p>
                <div className="stock-info">
                  <span className="stock-value">{product.stock} {product.unit}s</span>
                  {product.stock <= product.min_stock && <AlertCircle size={14} color="var(--danger)" />}
                </div>
              </div>
              <div className="card-price">
                <span className="price">Gs. {product.price.toLocaleString('es-PY')}</span>
                <div className="card-actions">
                  <button onClick={() => { setEditingItem(product); setProductForm(product); setShowModal('product'); }} className="btn-icon"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete('products', product.id)} className="btn-icon delete"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="list-grid">
          {categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(cat => (
            <div key={cat.id} className="list-item glass">
              <div className="item-info">
                <FolderRoot size={20} color="var(--primary)" />
                <span className="item-name">{cat.name}</span>
              </div>
              <div className="item-actions">
                 <button onClick={() => { setEditingItem(cat); setCategoryForm(cat); setShowModal('category'); }} className="btn-icon"><Edit2 size={16} /></button>
                 <button onClick={() => handleDelete('categories', cat.id)} className="btn-icon delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="list-grid">
          {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(sup => (
            <div key={sup.id} className="list-item glass">
              <div className="item-info">
                <Truck size={20} color="var(--secondary)" />
                <div className="sub-info">
                  <span className="item-name">{sup.name}</span>
                  <small>{sup.phone || 'Sin tel.'}</small>
                </div>
              </div>
              <div className="item-actions">
                 <button onClick={() => { setEditingItem(sup); setSupplierForm(sup); setShowModal('supplier'); }} className="btn-icon"><Edit2 size={16} /></button>
                 <button onClick={() => handleDelete('suppliers', sup.id)} className="btn-icon delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: PRODUCT */}
      {showModal === 'product' && (
        <div className="modal-overlay">
          <div className="modal-content glass inventory-modal">
            <div className="modal-header">
              <h2>{editingItem ? 'Editar' : 'Nuevo'} Producto</h2>
              <button onClick={closeAllModals} className="close-x"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="premium-form">
              <div className="form-group main">
                <label>Nombre del Producto</label>
                <input type="text" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Precio Venta</label>
                  <input type="number" required value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                </div>
                {isAdmin && (
                  <div className="form-group">
                    <label>Costo</label>
                    <input type="number" required value={productForm.cost} onChange={e => setProductForm({...productForm, cost: e.target.value})} />
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <select value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unidad</label>
                  <select value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})}>
                    <option value="Unidad">Unidad</option>
                    <option value="Kg">Kg</option>
                    <option value="Litro">Litro</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock Actual</label>
                  <input type="number" required value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Cód. Barras</label>
                  <div className="input-with-action">
                    <input type="text" value={productForm.barcode} onChange={e => setProductForm({...productForm, barcode: e.target.value})} />
                    <button type="button" onClick={() => setShowScanner(true)} className="inline-scan"><Camera size={18} /></button>
                  </div>
                </div>
              </div>
              <div className="modal-actions-footer">
                <button type="button" onClick={closeAllModals} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-save">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORY */}
      {showModal === 'category' && (
        <div className="modal-overlay">
          <div className="modal-content glass mini-modal">
            <h2>{editingItem ? 'Editar' : 'Nueva'} Categoría</h2>
            <form onSubmit={handleSaveCategory} className="premium-form">
              <div className="form-group">
                <label>Nombre de Categoría</label>
                <input type="text" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} />
              </div>
              <div className="modal-actions-footer">
                <button type="button" onClick={closeAllModals} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-save">Crear Categoría</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPPLIER */}
      {showModal === 'supplier' && (
        <div className="modal-overlay">
          <div className="modal-content glass mini-modal">
            <h2>{editingItem ? 'Editar' : 'Nuevo'} Proveedor</h2>
            <form onSubmit={handleSaveSupplier} className="premium-form">
              <div className="form-group">
                <label>Nombre / Razón Social</label>
                <input type="text" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Teléfono de contacto</label>
                <input type="text" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
              </div>
              <div className="modal-actions-footer">
                <button type="button" onClick={closeAllModals} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-save">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onScan={c => { setProductForm({...productForm, barcode: c}); setShowScanner(false); }} onClose={() => setShowScanner(false)} />
      )}

      <style>{`
        .inventory-page { max-width: 1200px; margin: 0 auto; }
        .header-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header-actions { display: flex; gap: 12px; }
        .sync-cloud-btn { background: #3ecf8e; color: white; padding: 12px 20px; border-radius: 12px; font-weight: bold; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(62, 207, 142, 0.3); transition: 0.3s; }
        .sync-cloud-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        
        .add-btn { background: var(--primary); color: white; padding: 12px 20px; border-radius: 12px; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(94, 92, 230, 0.3); }
        .secondary-btn { background: var(--bg-card); color: var(--text-main); padding: 10px 20px; border-radius: 12px; border: 1px solid var(--border); font-weight: 600; }

        .inventory-tabs { display: flex; gap: 5px; padding: 5px; border-radius: 15px; margin-bottom: 1.5rem; width: fit-content; background: rgba(0,0,0,0.1); }
        .inventory-tabs button { padding: 10px 20px; border-radius: 12px; border: none; background: none; color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 8px; transition: 0.3s; cursor: pointer; }
        .inventory-tabs button.active { background: white; color: var(--primary); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

        .search-bar { display: flex; align-items: center; padding: 12px 20px; border-radius: 15px; gap: 12px; margin-bottom: 2rem; border: 1px solid var(--border); }
        .search-bar input { flex: 1; background: none; border: none; font-size: 16px; color: var(--text-main); outline: none; }

        .inventory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .inventory-card { padding: 1.5rem; border-radius: 20px; border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between; position: relative; transition: 0.3s; }
        .inventory-card:hover { transform: translateY(-5px); border-color: var(--primary); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .inventory-card.critical { border-left: 6px solid var(--danger); background: rgba(255, 69, 58, 0.05); }

        .badge-cat { position: absolute; top: 1.5rem; right: 1.5rem; background: var(--bg-main); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; color: var(--primary); }
        .card-main h3 { margin: 1.5rem 0 5px 0; }
        .sku { font-size: 12px; color: var(--text-muted); font-family: monospace; letter-spacing: 1px; }
        .stock-info { margin-top: 15px; display: flex; align-items: center; gap: 8px; }
        .stock-value { font-weight: 800; font-size: 1.1rem; color: var(--text-main); }
        
        .card-price { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); }
        .card-price .price { font-size: 1.3rem; font-weight: bold; color: var(--primary); }

        .btn-icon { padding: 8px; border-radius: 10px; background: var(--bg-main); color: var(--text-muted); border: none; cursor: pointer; }
        .btn-icon:hover { background: rgba(94, 92, 230, 0.1); color: var(--primary); }
        .btn-icon.delete:hover { background: rgba(255, 69, 58, 0.1); color: var(--danger); }

        /* LIST VIEW FOR CATS/SUPS */
        .list-grid { display: flex; flex-direction: column; gap: 10px; max-width: 800px; }
        .list-item { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 2rem; border-radius: 15px; border: 1px solid var(--border); }
        .item-info { display: flex; align-items: center; gap: 1.5rem; }
        .sub-info { display: flex; flex-direction: column; }
        .item-name { font-weight: 700; font-size: 1.1rem; }
        .item-actions { display: flex; gap: 10px; }

        /* MODALS */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { width: 100%; max-width: 600px; padding: 2.5rem; border-radius: 25px; box-shadow: 0 30px 60px rgba(0,0,0,0.4); }
        .mini-modal { max-width: 450px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .close-x { background: none; border: none; color: var(--text-muted); }
        
        .premium-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: var(--text-muted); font-weight: 700; }
        .form-group input, .form-group select { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-main); color: var(--text-main); font-size: 1rem; outline: none; transition: 0.3s; }
        .form-group input:focus { border-color: var(--primary); background: white; }
        .main input { font-size: 1.4rem; font-weight: 800; border-color: var(--primary); }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .input-with-action { display: flex; gap: 10px; }
        .inline-scan { background: var(--primary); color: white; border-radius: 10px; padding: 10px; border: none; }
        
        .modal-actions-footer { display: flex; justify-content: flex-end; gap: 15px; margin-top: 2rem; }
        .btn-cancel { background: none; border: none; color: var(--danger); font-weight: bold; cursor: pointer; padding: 12px 20px; border-radius: 10px; }
        .btn-cancel:hover { background: rgba(255, 69, 58, 0.1); }
        .btn-save { background: var(--primary); color: white; border: none; font-weight: 800; padding: 14px 35px; border-radius: 14px; box-shadow: 0 4px 15px rgba(94, 92, 230, 0.4); cursor: pointer; }
      `}</style>
    </div>
  );
};
