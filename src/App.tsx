import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProductManagement } from './pages/ProductManagement';
import { ClientManagement } from './pages/ClientManagement';
import { DJCManagement } from './pages/DJCManagement';
import { DJCGenerator } from './components/DJC';
import { QRLanding } from './pages/QRLanding';
import ProductPassport from './pages/ProductPassport';
import { LoginForm } from './components/Auth/LoginForm';
import { useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './components/Common/LoadingSpinner';
import { QRModTool } from './components/QRModTool';
import { DeploymentInfoTool } from './components/DeploymentInfoTool';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/clients" element={<ClientManagement />} />
        <Route path="/validation" element={<InformationValidation />} />
        <Route path="/djc" element={<DJCManagement />} />
        <Route path="/djc-generator" element={<DJCGenerator />} />
      </Routes>
      {import.meta.env.DEV && <QRModTool />}
      {import.meta.env.DEV && <DeploymentInfoTool />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <DeploymentBanner />
        <Router>
          <Routes>
            {/* Rutas públicas (sin autenticación) */}
            <Route path="/qr/:uuid" element={<QRLanding />} />
            <Route path="/products/:uuid" element={<ProductPassport />} />
            
            {/* Rutas privadas (con autenticación) */}
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;