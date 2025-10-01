import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  es: {
    // Navigation
    dashboard: 'Panel de Control',
    productManagement: 'Gestión de Productos',
    clientManagement: 'Gestión de Clientes',
    informationValidation: 'Validación de Información',
    clientDataValidation: 'Carga de Certificados',
    dataUpload: 'Carga de Datos',
    djcManagement: 'Gestión de DJC',
    logout: 'Cerrar Sesión',
    
    // Auth
    signIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    
    // Common
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    search: 'Buscar',
    filter: 'Filtrar',
    upload: 'Subir',
    download: 'Descargar',
    generate: 'Generar',
    validate: 'Validar',
    sync: 'Sincronizar',
    
    // Dashboard
    totalProducts: 'Total Productos',
    totalClients: 'Total Clientes',
    pendingDJCs: 'DJCs Pendientes',
    errorLogs: 'Logs de Errores',
    recentActivity: 'Actividad Reciente',
    welcome: 'Bienvenido al Dashboard',
    
    // Products
    products: 'Productos',
    codification: 'Codificación',
    client: 'Cliente',
    titular: 'Titular',
    certificationType: 'Tipo de Certificación',
    status: 'Estado',
    expirationDate: 'Fecha de Vencimiento',
    daysToExpire: 'Días para Vencer',
    djcStatus: 'Estado DJC',
    certificateStatus: 'Estado Certificado',
    sentToClient: 'Enviado al Cliente',
    
    // Clients
    clients: 'Clientes',
    cuit: 'CUIT',
    businessName: 'Razón Social',
    address: 'Dirección',
    
    // DJC
    generateDJC: 'Generar DJC',
    uploadCertificate: 'Subir Certificado',
    signDJC: 'Firmar DJC',
    markAsSent: 'Marcar como Enviado',
    
    // Status
    notGenerated: 'No Generada',
    generatedPendingSignature: 'Generada Pendiente de Firma',
    signed: 'Firmada',
    pendingUpload: 'Pendiente Subida',
    uploaded: 'Subido',
    pending: 'Pendiente',
    sent: 'Enviado',
    
    // Validation
    validationResults: 'Resultados de Validación',
    validationPassed: 'Validación Exitosa',
    validationFailed: 'Validación Fallida',
    missingFields: 'Campos Faltantes',
    invalidFormat: 'Formato Inválido',
    
    // Errors
    error: 'Error',
    success: 'Éxito',
    warning: 'Advertencia',
    info: 'Información',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    productManagement: 'Product Management',
    clientManagement: 'Client Management',
    informationValidation: 'Information Validation',
    clientDataValidation: 'Certificate Upload',
    dataUpload: 'Data Upload',
    djcManagement: 'DJC Management',
    logout: 'Logout',
    
    // Auth
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    upload: 'Upload',
    download: 'Download',
    generate: 'Generate',
    validate: 'Validate',
    sync: 'Sync',
    
    // Dashboard
    totalProducts: 'Total Products',
    totalClients: 'Total Clients',
    pendingDJCs: 'Pending DJCs',
    errorLogs: 'Error Logs',
    recentActivity: 'Recent Activity',
    welcome: 'Welcome to Dashboard',
    
    // Products
    products: 'Products',
    codification: 'Codification',
    client: 'Client',
    titular: 'Titular',
    certificationType: 'Certification Type',
    status: 'Status',
    expirationDate: 'Expiration Date',
    daysToExpire: 'Days to Expire',
    djcStatus: 'DJC Status',
    certificateStatus: 'Certificate Status',
    sentToClient: 'Sent to Client',
    
    // Clients
    clients: 'Clients',
    cuit: 'CUIT',
    businessName: 'Business Name',
    address: 'Address',
    
    // DJC
    generateDJC: 'Generate DJC',
    uploadCertificate: 'Upload Certificate',
    signDJC: 'Sign DJC',
    markAsSent: 'Mark as Sent',
    
    // Status
    notGenerated: 'Not Generated',
    generatedPendingSignature: 'Generated Pending Signature',
    signed: 'Signed',
    pendingUpload: 'Pending Upload',
    uploaded: 'Uploaded',
    pending: 'Pending',
    sent: 'Sent',
    
    // Validation
    validationResults: 'Validation Results',
    validationPassed: 'Validation Passed',
    validationFailed: 'Validation Failed',
    missingFields: 'Missing Fields',
    invalidFormat: 'Invalid Format',
    
    // Errors
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[Language]] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}