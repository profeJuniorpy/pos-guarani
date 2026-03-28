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

function App() {
  return (
    <Router>
      <AuthProvider>
        <BranchProvider>
          <BrandingProvider>
            <div className="app-container">
            <Navbar />
            <main className="main-content">
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

      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-bottom: 70px; /* Space for mobile bottom bar */
        }

        .main-content {
          flex: 1;
          padding: 16px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }

        @media (min-width: 768px) {
          .app-container {
            flex-direction: row;
            padding-bottom: 0;
            padding-left: 240px; /* Space for desktop sidebar */
          }
          
          .main-content {
            padding: 32px;
          }
        }
      `}</style>
    </Router>
  );
}

export default App;
