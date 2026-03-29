import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Settings } from './pages/Settings';
import { Inventory } from './pages/Inventory';
import { POS } from './pages/POS';
import { Home } from './pages/Home';
import { Reports } from './pages/Reports';
import { Cashier } from './pages/Cashier';
import { BrandingProvider } from './context/BrandingContext';
import { AuthProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { db } from './db/db';
import { supabase } from './utils/supabase';

window.db = db;
window.supabase = supabase;

function App() {
  return (
    <Router>
      <AuthProvider>
        <BranchProvider>
          <BrandingProvider>
            <div className="d-flex flex-column min-vh-100 bg-light">
              <Navbar />
              <main className="flex-grow-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/cashier" element={<Cashier />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
          </BrandingProvider>
        </BranchProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
