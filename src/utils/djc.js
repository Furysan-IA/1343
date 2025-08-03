// Función para formatear CUIT
export const formatCuit = (cuit) => {
  if (!cuit) return 'CAMPO NO ENCONTRADO';
  const str = cuit.toString();
  return `${str.slice(0, 2)}-${str.slice(2, 10)}-${str.slice(10)}`;
};

// Función para generar número de DJC
export const generateDJCNumber = () => {
  return `DJC-2025-${Date.now().toString().slice(-6)}`;
};

// Resoluciones disponibles
export const RESOLUCIONES = [
  { id: 1, codigo: 'Res. SICYC N° 16/2025', descripcion: 'Seguridad Eléctrica' },
  { id: 2, codigo: 'Res. SICYC N° 169/2018', descripcion: 'Juguetes' },
  { id: 3, codigo: 'Res. SICYC N° 508/2015', descripcion: 'Productos Eléctricos y Electrónicos' }
];

// Datos de demostración
export const demoClients = [
  {
    cuit: 30712345678,
    razon_social: 'EMPRESA DEMO S.A.',
    direccion: 'Av. Corrientes 1234, CABA',
    email: 'info@empresademo.com',
    telefono: '+54 11 4555-0000'
  },
  {
    cuit: 30798765432,
    razon_social: 'IMPORTADORA TEST S.R.L.',
    direccion: 'San Martín 456, Morón',
    email: 'contacto@importtest.com',
    telefono: null
  }
];

export const demoProducts = [
  {
    codificacion: 'PROD-2025-001',
    cuit: 30712345678,
    marca: 'ELECTRO-TECH',
    producto: 'Ventilador de Techo',
    caracteristicas_tecnicas: '220V, 60W, 3 velocidades',
    fabricante: 'TechCorp Manufacturing',
    planta_fabricacion: 'Shenzhen, China',
    normas_aplicacion: 'IRAM 2063:2018',
    qr_link: 'https://djc.gob.ar/verify/001'
  },
  {
    codificacion: 'PROD-2025-002',
    cuit: 30712345678,
    marca: 'ELECTRO-TECH',
    producto: 'Calefactor Eléctrico',
    caracteristicas_tecnicas: '1500W, termostato',
    fabricante: 'HeatMaster Ltd',
    planta_fabricacion: null,
    normas_aplicacion: 'IEC 60335-1:2020',
    qr_link: null
  }
];