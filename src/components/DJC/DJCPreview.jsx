import React from 'react';
import { XCircle, FileDown } from 'lucide-react';
import html2pdf from 'html2pdf.js';

export default function DJCPreview({ djcData, onClose }) {
  const downloadPDF = () => {
    const element = document.getElementById('djc-content');
    const opt = {
      margin: 20,
      filename: `DJC-${djcData.numero_djc}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b no-print">
          <h2 className="text-xl font-bold text-gray-900">Vista Previa DJC</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div id="djc-content" className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">DECLARACIÓN JURADA DE CONFORMIDAD (DJC)</h1>
              <p className="text-lg">{djcData.resolucion}</p>
              <p className="mt-4 font-semibold">Número de Identificación de DJC:</p>
              <p>{djcData.numero_djc}</p>
              <p className="text-sm italic text-gray-600">(número único de identificación autodeterminado)</p>
            </div>

            <hr className="my-6" />

            <div className="space-y-6">
              <section>
                <h3 className="font-bold text-lg mb-3">Información del Fabricante o Importador:</h3>
                <div className="space-y-2 pl-4">
                  <p>● <strong>Razón Social:</strong>{' '}
                    <span className={djcData.razon_social === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.razon_social}
                    </span>
                  </p>
                  <p>● <strong>C.U.I.T. N°</strong><span className="italic text-sm">(cuando fuera aplicable)</span><strong>:</strong>{' '}
                    <span className={djcData.cuit === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.cuit}
                    </span>
                  </p>
                  <p>● <strong>Nombre Comercial o Marca Registrada:</strong>{' '}
                    <span className={djcData.nombre_comercial === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.nombre_comercial}
                    </span>
                  </p>
                  <p>● <strong>Domicilio Legal:</strong>{' '}
                    <span className={djcData.domicilio_legal === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.domicilio_legal}
                    </span>
                  </p>
                  <p>● <strong>Domicilio de la planta de producción o del depósito del importador:</strong>{' '}
                    <span className="text-gray-500 italic">No especificado</span>
                  </p>
                  <p>● <strong>Teléfono:</strong>{' '}
                    <span className={djcData.telefono === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.telefono}
                    </span>
                  </p>
                  <p>● <strong>Correo Electrónico:</strong>{' '}
                    <span className={djcData.email === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.email}
                    </span>
                  </p>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3">Representante Autorizado (si corresponde):</h3>
                <div className="space-y-2 pl-4 text-gray-500 italic">
                  <p>● <strong>Nombre y Apellido / Razón Social:</strong> No aplica</p>
                  <p>● <strong>Domicilio Legal:</strong> No aplica</p>
                  <p>● <strong>C.U.I.T. N°:</strong> No aplica</p>
                </div>
              </section>

              <hr />

              <section>
                <p className="pl-4 mb-4">● <strong>Información del Producto</strong> <span className="italic text-sm">(por producto o familia de productos)</span><strong>:</strong></p>
                
                <div className="space-y-2 pl-4">
                  <p>● <strong>Código de Identificación Único del Producto</strong> <span className="italic text-sm">(autodeterminado)</span><strong>:</strong>{' '}
                    <span className={djcData.codigo_identificacion === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.codigo_identificacion}
                    </span>
                  </p>
                  <p>● <strong>Fabricante</strong><span className="italic text-sm">(Incluir domicilio de la planta de producción)</span><strong>:</strong>{' '}
                    <span className={djcData.fabricante_completo === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.fabricante_completo}
                    </span>
                  </p>
                  <p>● <strong>Identificación del producto</strong> <span className="italic text-sm">(marca, modelo, características técnicas)</span><strong>:</strong>{' '}
                    <span className={djcData.identificacion_producto === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.identificacion_producto}
                    </span>
                  </p>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3">Normas y Evaluación de la Conformidad:</h3>
                <div className="space-y-3 pl-4">
                  <div>
                    <p>● <strong>Reglamento/s Aplicable/s:</strong>{' '}
                      <span className="text-blue-600">{djcData.resolucion}</span>
                    </p>
                    <p className="text-sm italic text-gray-600 ml-4">(Detallar el o los reglamentos bajo los cuales se encuentra alcanzado el producto)</p>
                  </div>
                  <div>
                    <p>● <strong>Norma/s Técnica/s:</strong>{' '}
                      <span className={djcData.normas_tecnicas === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                        {djcData.normas_tecnicas}
                      </span>
                    </p>
                    <p className="text-sm italic text-gray-600 ml-4">(Incluir normas técnicas específicas a las que se ajusta el producto)</p>
                  </div>
                  <div>
                    <p>● <strong>Referencia al Documento de Evaluación de la Conformidad:</strong>{' '}
                      <span className={djcData.documento_evaluacion === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                        {djcData.documento_evaluacion}
                      </span>
                    </p>
                    <p className="text-sm italic text-gray-600 ml-4">(Emitido por un OEC, especificar el número de referencia)</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3">Otros Datos:</h3>
                <div className="pl-4">
                  <p>● <strong>Enlace a la copia de la Declaración de la Conformidad en Internet:</strong>{' '}
                    <span className={djcData.enlace_declaracion === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.enlace_declaracion}
                    </span>
                  </p>
                  <p className="text-sm italic text-gray-600 ml-4">(Si está disponible, incluir el enlace al documento en línea)</p>
                </div>
              </section>

              <div className="mt-8 pt-6 border-t">
                <p className="italic text-sm text-gray-700 text-justify">
                  La presente declaración jurada de conformidad se emite, en todo de acuerdo con el/los 
                  Reglamentos Técnicos aludidos precedentemente, asumiendo la responsabilidad directa 
                  por los datos declarados, así como por la conformidad del producto.
                </p>
                
                <div className="mt-8">
                  <p><strong>Fecha y Lugar:</strong></p>
                  <p className="italic text-sm">(Indicar)</p>
                  <p>{djcData.fecha_lugar}</p>
                  
                  <div className="mt-12">
                    <p><strong>Firma:</strong></p>
                    <p className="italic text-sm">(Firma del responsable)</p>
                    <div className="mt-16 border-b-2 border-gray-400 w-64"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-center gap-4 no-print">
          <button
            onClick={downloadPDF}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}