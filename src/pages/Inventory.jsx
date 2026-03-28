import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Plus, Search, Edit2, Trash2, Camera, AlertCircle, ShoppingBag, FolderRoot, Truck, X, Download } from 'lucide-react';
import { BarcodeScanner } from '../components/pos/BarcodeScanner';
import { useAuth } from '../context/AuthContext';
import { useBranches } from '../context/BranchContext';
import { supabase } from '../utils/supabase';

export const Inventory = () => {
  const { isAdmin } = useAuth();
  const { activeBranch } = useBranches();
  
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

  useEffect(() => { loadData(); }, [activeBranch]);

  const loadData = async () => {
    if (!activeBranch) return;

    const [p, c, s] = await Promise.all([
      db.products.toArray(),
      db.categories.toArray(),
      db.suppliers.toArray()
    ]);

    // Obtener stock específico de la sucursal activa
    const branchStock = await db.branch_stock.where('branch_id').equals(activeBranch.id).toArray();
    const productsWithBranchStock = p.map(prod => {
      const stockEntry = branchStock.find(bs => bs.product_id === prod.id);
      return { ...prod, stock: stockEntry ? stockEntry.stock : 0 };
    });

    setProducts(productsWithBranchStock);
    setCategories(c);
    setSuppliers(s);
  };

  const syncToCloud = async (table, data) => {
    try {
      const { error } = await supabase.from(table).upsert([data]);
      if (error) throw error;
    } catch (err) {
      console.warn(`❌ Sync fail ${table}:`, err.message);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!activeBranch) return;

    const productData = { 
      name: productForm.name, 
      barcode: productForm.barcode, 
      price: Number(productForm.price), 
      cost: Number(productForm.cost), 
      min_stock: Number(productForm.min_stock), 
      category_id: productForm.category_id, 
      unit: productForm.unit 
    };
    
    let productId;
    if (editingItem) {
      productId = editingItem.id;
      await db.products.update(productId, productData);
    } else {
      productId = await db.products.add(productData);
    }
    
    await db.branch_stock.where({ product_id: productId, branch_id: activeBranch.id }).delete();
    await db.branch_stock.add({ 
      product_id: productId, 
      branch_id: activeBranch.id, 
      stock: Number(productForm.stock) 
    });

    syncToCloud('products', { id: productId, ...productData });
    syncToCloud('branch_stock', { product_id: productId, branch_id: activeBranch.id, stock: Number(productForm.stock) });

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
        <head><title>Inventario - San Lucas</title>
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

  return (
    <div className="container-fluid pt-3 animate-fade pb-5 mb-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h2 className="fw-bold text-dark m-0 d-flex align-items-center">
          <ShoppingBag className="me-2 text-success" /> Inventario
        </h2>
        
        <div className="d-flex flex-wrap gap-2">
          {isAdmin && (
            <button onClick={handlePrintList} className="btn btn-outline-secondary fw-bold rounded-pill shadow-sm">
              <Download size={18} className="me-1" /> Imprimir
            </button>
          )}
          <button 
            className="btn btn-success fw-bold rounded-pill shadow-sm px-4"
            onClick={() => setShowModal(activeTab === 'products' ? 'product' : activeTab === 'categories' ? 'category' : 'supplier')}
          >
            <Plus size={18} className="me-1" /> Nuevo {activeTab === 'products' ? 'Producto' : activeTab === 'categories' ? 'Categoría' : 'Proveedor'}
          </button>
        </div>
      </div>

      <div className="row mb-4 g-3">
        <div className="col-12 col-lg-6">
          <ul className="nav nav-pills p-1 bg-white border shadow-sm rounded-pill w-100 w-md-auto d-flex flex-nowrap overflow-auto no-scrollbar styling-pills">
            <li className="nav-item flex-grow-1 text-center">
              <button className={`nav-link rounded-pill fw-bold w-100 ${activeTab === 'products' ? 'active bg-success shadow-sm' : 'text-dark'}`} onClick={() => setActiveTab('products')}>Productos</button>
            </li>
            <li className="nav-item flex-grow-1 text-center">
              <button className={`nav-link rounded-pill fw-bold w-100 ${activeTab === 'categories' ? 'active bg-success shadow-sm' : 'text-dark'}`} onClick={() => setActiveTab('categories')}>Categorías</button>
            </li>
            <li className="nav-item flex-grow-1 text-center">
              <button className={`nav-link rounded-pill fw-bold w-100 ${activeTab === 'suppliers' ? 'active bg-success shadow-sm' : 'text-dark'}`} onClick={() => setActiveTab('suppliers')}>Proveedores</button>
            </li>
          </ul>
        </div>
        <div className="col-12 col-lg-6">
          <div className="input-group shadow-sm border rounded-pill bg-white overflow-hidden">
            <span className="input-group-text bg-white border-0 ps-3">
              <Search size={20} className="text-muted" />
            </span>
            <input 
              type="text" 
              className="form-control border-0 py-2 shadow-none" 
              placeholder={`Buscando en ${activeTab === 'products' ? 'productos' : activeTab === 'categories' ? 'categorías' : 'proveedores'}...`} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <span className="input-group-text bg-white border-0 pe-3 cursor-pointer" onClick={() => setSearchTerm('')}>
                <X size={18} className="text-secondary" style={{cursor: 'pointer'}} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* VIEW: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="row g-3">
          {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode?.includes(searchTerm)).map(product => (
            <div key={product.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
              <div className={`card h-100 border-0 shadow-sm rounded-4 transition-transform ${product.stock <= product.min_stock ? 'border border-danger border-2 border-opacity-50' : ''}`}>
                <div className="card-body p-4 position-relative d-flex flex-column h-100">
                  <span className="badge bg-light text-dark border position-absolute top-0 end-0 m-3 rounded-pill px-2 py-1">
                    {categories.find(c => c.id === Number(product.category_id))?.name || 'General'}
                  </span>
                  
                  <h5 className="card-title fw-bold text-dark pe-5 mb-1 mt-1 text-truncate-2" style={{lineHeight: 1.2}}>
                    {product.name}
                  </h5>
                  <small className="text-muted font-monospace mb-3 d-block">{product.barcode || 'Sin Código'}</small>
                  
                  <div className="d-flex align-items-center mb-3">
                    <span className={`fs-5 fw-bold ${product.stock <= product.min_stock ? 'text-danger' : 'text-dark'}`}>
                      {product.stock} {product.unit}s
                    </span>
                    {product.stock <= product.min_stock && <AlertCircle size={18} className="text-danger ms-2" />}
                  </div>
                  
                  <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                    <span className="fs-4 fw-bold text-success">Gs. {product.price.toLocaleString()}</span>
                    
                    <div className="d-flex gap-1">
                      <button onClick={() => { setEditingItem(product); setProductForm(product); setShowModal('product'); }} className="btn btn-light rounded-circle p-2 text-muted border shadow-sm">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete('products', product.id)} className="btn btn-light rounded-circle p-2 text-danger border shadow-sm">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="row g-3">
          {categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(cat => (
            <div key={cat.id} className="col-12 col-md-4 col-lg-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden w-75">
                    <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3 flex-shrink-0 text-success">
                      <FolderRoot size={20} />
                    </div>
                    <span className="fw-bold fs-6 text-truncate">{cat.name}</span>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingItem(cat); setCategoryForm(cat); setShowModal('category'); }} className="btn btn-sm btn-light text-muted border p-2 rounded-circle"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete('categories', cat.id)} className="btn btn-sm btn-light text-danger border p-2 rounded-circle"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="row g-3">
          {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(sup => (
            <div key={sup.id} className="col-12 col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden w-75">
                    <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3 flex-shrink-0 text-success">
                      <Truck size={20} />
                    </div>
                    <div>
                      <div className="fw-bold text-truncate">{sup.name}</div>
                      <small className="text-muted text-truncate d-block">{sup.phone || 'Sin tel.'}</small>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingItem(sup); setSupplierForm(sup); setShowModal('supplier'); }} className="btn btn-sm btn-light text-muted border p-2 rounded-circle"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete('suppliers', sup.id)} className="btn btn-sm btn-light text-danger border p-2 rounded-circle"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {showModal && <div className="modal-backdrop fade show"></div>}

      {/* PRODUCT MODAL */}
      <div className={`modal fade ${showModal === 'product' ? 'show d-block' : ''}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header border-0 pb-0">
              <h4 className="modal-title fw-bold text-dark">{editingItem ? 'Editar Producto' : 'Nuevo Producto'}</h4>
              <button type="button" className="btn-close" onClick={closeAllModals}></button>
            </div>
            <div className="modal-body p-4 pt-3">
              <form id="productForm" onSubmit={handleSaveProduct}>
                <div className="mb-4">
                  <label className="form-label text-muted fw-bold">Nombre del Producto</label>
                  <input type="text" className="form-control form-control-lg fw-bold border-1 shadow-none" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Ej. Coca-Cola 2L" />
                </div>
                
                <div className="row g-3 mb-4">
                  <div className="col-12 col-sm-6">
                    <label className="form-label text-muted fw-bold">Precio de Venta</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">Gs.</span>
                      <input type="number" className="form-control form-control-lg border-start-0 ps-0 text-success fw-bold" required value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-muted fw-bold">Costo Unitario</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">Gs.</span>
                        <input type="number" className="form-control form-control-lg border-start-0 ps-0 text-dark fw-bold" required value={productForm.cost || ''} onChange={e => setProductForm({...productForm, cost: e.target.value})} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-12 col-sm-6">
                    <label className="form-label text-muted fw-bold">Categoría</label>
                    <select className="form-select form-select-lg w-100" value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})}>
                      <option value="">Seleccionar...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label text-muted fw-bold">Unidad de Medida</label>
                    <select className="form-select form-select-lg w-100" value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})}>
                      <option value="Unidad">Unidad</option>
                      <option value="Kg">Kilogramos</option>
                      <option value="Litro">Litros</option>
                    </select>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6 col-sm-3">
                    <label className="form-label text-muted fw-bold">Stock Actual</label>
                    <input type="number" className="form-control form-control-lg" required value={productForm.stock === 0 && !editingItem ? '' : productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
                  </div>
                  <div className="col-6 col-sm-3">
                    <label className="form-label text-muted fw-bold">Stock Mínimo</label>
                    <input type="number" className="form-control form-control-lg" required value={productForm.min_stock} onChange={e => setProductForm({...productForm, min_stock: e.target.value})} />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label text-muted fw-bold">Cod. de Barras (Opcional)</label>
                    <div className="input-group input-group-lg">
                      <input type="text" className="form-control" value={productForm.barcode || ''} onChange={e => setProductForm({...productForm, barcode: e.target.value})} placeholder="Escanear..." />
                      <button type="button" className="btn btn-dark d-flex align-items-center" onClick={() => setShowScanner(true)}>
                        <Camera size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer border-0 p-4 pt-1">
              <button type="button" className="btn btn-light btn-lg rounded-pill px-4 fw-bold" onClick={closeAllModals}>Cancelar</button>
              <button type="submit" form="productForm" className="btn btn-success btn-lg rounded-pill px-5 fw-bold shadow-sm">Guardar</button>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY & SUPPLIER MODALS */}
      <div className={`modal fade ${['category', 'supplier'].includes(showModal) ? 'show d-block' : ''}`} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header border-0">
              <h5 className="modal-title fw-bold text-dark">
                {showModal === 'category' ? (editingItem ? 'Editar Categoría' : 'Nueva Categoría') : (editingItem ? 'Editar Proveedor' : 'Nuevo Proveedor')}
              </h5>
              <button type="button" className="btn-close" onClick={closeAllModals}></button>
            </div>
            <div className="modal-body">
              {showModal === 'category' && (
                <form id="catForm" onSubmit={handleSaveCategory}>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold">Nombre</label>
                    <input type="text" className="form-control form-control-lg" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} />
                  </div>
                </form>
              )}
              {showModal === 'supplier' && (
                <form id="supForm" onSubmit={handleSaveSupplier}>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold">Razón Social</label>
                    <input type="text" className="form-control form-control-lg" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold">Teléfono</label>
                    <input type="text" className="form-control form-control-lg" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
                  </div>
                </form>
              )}
            </div>
            <div className="modal-footer border-0 mt-2">
              <button type="button" className="btn btn-light rounded-pill px-4 fw-bold mb-2 w-100" onClick={closeAllModals}>Cancelar</button>
              <button type="submit" form={showModal === 'category' ? 'catForm' : 'supForm'} className="btn btn-success rounded-pill px-4 fw-bold w-100 py-3 shadow-sm pt-2 pb-2">Guardar Registro</button>
            </div>
          </div>
        </div>
      </div>

      {/* COMPONENT OUTSIDE */}
      {showScanner && (
        <BarcodeScanner onScan={c => { setProductForm({...productForm, barcode: c}); setShowScanner(false); }} onClose={() => setShowScanner(false)} />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .text-truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; }
        .transition-transform { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
        .transition-transform:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important; border-color: #198754 !important; }
      `}</style>
    </div>
  );
};
