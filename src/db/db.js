import Dexie from 'dexie';

export const db = new Dexie('GuaraniPOS');

db.version(4).stores({
  products: '++id, name, barcode, category_id, stock',
  categories: '++id, name',
  suppliers: '++id, name, phone, email',
  sales: '++id, timestamp, total',
  settings: 'id, business_name, logo_url',
  inventory_logs: '++id, product_id, timestamp',
  cashSessions: '++id, status, openTime',
  cash_movements: '++id, sessionId, type, amount, description, timestamp'
});

// Initial data for categories
db.on('populate', () => {
  db.categories.bulkAdd([
    { name: 'Frutas' },
    { name: 'Verduras' },
    { name: 'Almacén' }
  ]);
});
