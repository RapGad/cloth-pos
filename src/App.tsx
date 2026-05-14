import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { Layout } from './components/Layout.tsx';
import { Login } from './pages/Login.tsx';
import { Home } from './pages/Home.tsx';
import { Sales } from './pages/Sales.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { Settings } from './pages/Settings.tsx';
import { Transactions } from './pages/Transactions.tsx';
import { Reports } from './pages/Reports.tsx';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Home />} />
            <Route path="sales" element={<Sales />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="reports" element={
              <ProtectedRoute requiredRole="admin">
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute requiredRole="admin">
                <Settings />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
