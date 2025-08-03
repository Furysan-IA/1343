import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FileText, Upload, Download, Edit, Send } from 'lucide-react';

export function DJCManagement() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('djcManagement')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de Declaraciones Juradas de Conformidad (DJC)
        </p>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Gestión de DJC
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Aquí podrás generar, firmar y gestionar las Declaraciones Juradas de Conformidad.
            </p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generar DJC
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}