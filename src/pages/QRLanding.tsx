import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, QrCode, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export function QRLanding() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!uuid) {
      navigate('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(`/products/${uuid}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [uuid, navigate]);

  const handleManualRedirect = () => {
    if (uuid) {
      navigate(`/products/${uuid}`);
    }
  };

  if (!uuid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Código QR Inválido</h2>
          <p className="text-gray-600">No se pudo procesar el código QR escaneado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Verificando Producto
        </h1>
        <p className="text-gray-600 mb-8">
          UUID: <span className="font-mono font-medium">{uuid}</span>
        </p>

        {/* Countdown */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#3b82f6"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(countdown / 3) * 251.2} 251.2`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-blue-600">{countdown}</span>
            </div>
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-gray-700">Cargando información del producto...</span>
        </div>

        {/* Botón manual */}
        <button
          onClick={handleManualRedirect}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>Ver información ahora</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Sistema Oficial de Verificación</span>
          </div>
        </div>
      </div>
    </div>
  );
}