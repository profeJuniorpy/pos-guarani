import Dexie from 'dexie';

export const db = new Dexie('GuaraniPOS');

db.version(5).stores({
  products: '++id, name, barcode, category_id',
  categories: '++id, name',
  suppliers: '++id, name, phone, email',
  branches: '++id, name, address',
  branch_stock: '++id, [product_id+branch_id], product_id, branch_id, stock',
  sales: '++id, timestamp, total, branch_id',
  settings: 'id, business_name, logo_url',
  inventory_logs: '++id, product_id, timestamp, branch_id',
  cashSessions: '++id, status, openTime, branch_id',
  cash_movements: '++id, sessionId, type, amount, description, timestamp, branch_id'
});

// Initial data for categories
db.on('populate', () => {
  db.categories.bulkAdd([
    { name: 'Frutas' },
    { name: 'Verduras' },
    { name: 'Almacén' }
  ]);
});
