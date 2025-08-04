import { Shield, QrCode, CheckCircle, Globe, ArrowRight } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Verificación de Productos</h1>
                <p className="text-xs text-gray-600">Sistema Argentino de Certificación</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Sistema Oficial</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl">
              <QrCode className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Verificación de
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700">
              Productos Certificados
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Sistema oficial para verificar la autenticidad y certificación de productos 
            mediante códigos QR. Accede a información completa y confiable.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <QrCode className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Escanea el Código QR</h3>
              <p className="text-sm text-gray-600">
                Usa la cámara de tu dispositivo para escanear el código QR del producto
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Shield className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Verifica la Información</h3>
              <p className="text-sm text-gray-600">
                Accede a datos oficiales de certificación y cumplimiento normativo
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Confirma la Autenticidad</h3>
              <p className="text-sm text-gray-600">
                Garantiza que el producto cumple con las normas argentinas
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Certificación Oficial</h3>
            <p className="text-gray-600">
              Información verificada por organismos oficiales de certificación argentinos.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Acceso Universal</h3>
            <p className="text-gray-600">
              Disponible 24/7 desde cualquier dispositivo con conexión a internet.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Información Completa</h3>
            <p className="text-gray-600">
              Datos técnicos, normas aplicables, fechas de vigencia y documentación.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Tienes un Código QR?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Escanéalo con la cámara de tu dispositivo para acceder instantáneamente 
            a la información oficial del producto.
          </p>
          <div className="flex justify-center">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 flex items-center gap-4">
              <QrCode className="w-12 h-12 text-white" />
              <div className="text-left">
                <p className="font-semibold">Escanea para verificar</p>
                <p className="text-sm text-blue-100">Información oficial y actualizada</p>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold">Sistema Argentino de Certificación</span>
            </div>
            <p className="text-gray-400 mb-4">
              Verificación oficial de productos certificados en Argentina
            </p>
            <div className="flex justify-center items-center gap-6 text-sm text-gray-500">
              <span>© 2025 Gobierno de Argentina</span>
              <span>•</span>
              <span>Sistema Oficial</span>
              <span>•</span>
              <span>Información Verificada</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}