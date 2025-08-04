import React from 'react';

export function QRLanding() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Página de Aterrizaje QR
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-center">
            Esta será la página que se mostrará cuando se escanee un código QR.
          </p>
        </div>
      </div>
    </div>
  );
}