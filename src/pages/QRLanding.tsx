import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, Loader2, Package, CheckCircle } from 'lucide-react';

export function QRLanding() {
  const { uuid: codificacion } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!codificacion) {
      // Si no hay codificación, redirigir al home
      navigate('/');
      return;
    }

    // Iniciar cuenta regresiva
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [codificacion, navigate]);

  const handleRedirect = () => {
    if (!codificacion) return;
    
    setIsRedirecting(true);
    // Redirigir a la página del producto
    navigate(`/products/${codificacion}`);
  };

  const handleManualRedirect = () => {
    if (countdown > 0) {
      setCountdown(0);
      handleRedirect();
    }
  };

  if (!codificacion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
          <div className="text-red-500 mb-4">
            <QrCode className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Código QR Inválido
          </h1>
          <p className="text-gray-600 mb-6">
            No se pudo identificar el producto. Verifique que el código QR sea válido.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center max-w-md w-full border border-white/20">
        {/* Icono animado */}
        <div className="mb-6 relative">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            {isRedirecting ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            ) : countdown === 0 ? (
              <CheckCircle className="w-10 h-10 text-white" />
            ) : (
              <QrCode className="w-10 h-10 text-white" />
            )}
          </div>
          
          {/* Anillo de progreso */}
          {countdown > 0 && !isRedirecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (countdown / 3)}`}
                  className="text-indigo-500 transition-all duration-1000 ease-linear"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Título y descripción */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isRedirecting ? 'Redirigiendo...' : countdown === 0 ? '¡Listo!' : 'Código QR Escaneado'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {isRedirecting 
            ? 'Cargando información del producto...'
            : countdown === 0 
            ? 'Accediendo a la información del producto'
            : `Accediendo a la información del producto: ${codificacion}`
          }
        </p>

        {/* Cuenta regresiva */}
        {countdown > 0 && !isRedirecting && (
          <div className="mb-8">
            <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
              {countdown}
            </div>
            <p className="text-sm text-gray-500">
              Redirección automática en {countdown} segundo{countdown !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Información del producto */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-gray-700">
            <Package className="w-5 h-5" />
            <span className="font-medium">Producto:</span>
            <code className="bg-white px-2 py-1 rounded text-sm font-mono">
              {codificacion}
            </code>
          </div>
        </div>

        {/* Botón de redirección manual */}
        {countdown > 0 && !isRedirecting && (
          <button
            onClick={handleManualRedirect}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <span>Acceder Ahora</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {/* Indicador de carga cuando está redirigiendo */}
        {isRedirecting && (
          <div className="flex items-center justify-center gap-3 text-indigo-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Cargando información del producto...</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Sistema de Gestión de Certificados y DJC
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Verificación de productos certificados
          </p>
        </div>
      </div>

      {/* Partículas flotantes decorativas */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}