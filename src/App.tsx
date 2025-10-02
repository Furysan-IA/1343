import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProductManagement } from './pages/ProductManagement';
import { ClientManagement } from './pages/ClientManagement';
import { InformationValidation } from './pages/InformationValidation';
import DataUploadPage from './pages/DataUpload';
import DataUpdate from './pages/DataUpdate';
import { DJCManagement } from './pages/DJCManagement';
import { DJCGenerator } from './components/DJC';
import DJCTemplateEditor from './components/DJC/DJCTemplateEditor';
import { QRLanding } from './pages/QRLanding';
import ProductPassport from './pages/ProductPassport';
import { LoginForm } from './components/Auth/LoginForm';
import { useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './components/Common/LoadingSpinner';
import { QRModTool } from './components/QRModTool';

function RouteLogger() {
  const location = useLocation();

  useEffect(() => {
    console.log('🛣️ ROUTE CHANGED TO:', location.pathname);
  }, [location]);

  return null;
}

function AppContent() {
  const { user, loading } = useAuth();

  console.log('🏢 AppContent render, user:', !!user, 'loading:', loading);

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
      <RouteLogger />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/clients" element={<ClientManagement />} />
        <Route path="/validation" element={<InformationValidation />} />
        <Route path="/data-upload" element={<DataUploadPage />} />
        <Route path="/data-update" element={<DataUpdate />} />
        <Route path="/djc" element={<DJCManagement />} />
        <Route path="/djc-generator" element={<DJCGenerator />} />
        <Route path="/djc/editor-plantillas" element={<DJCTemplateEditor />} />
      </Routes>
      {import.meta.env.DEV && <QRModTool />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
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