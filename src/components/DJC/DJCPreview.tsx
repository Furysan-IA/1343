import React from 'react';
import { X, Download, Loader as Loader2 } from 'lucide-react';

interface DJCPreviewData {
  numero_djc: string;
  resolucion: string;
  razon_social: string;
  cuit: string;
  marca: string;
  domicilio_legal: string;
  domicilio_planta: string;
  telefono: string;
  email: string;
  representante_nombre: string;
  representante_domicilio: string;
  representante_cuit: string;
  codigo_producto: string;
  fabricante: string;
  identificacion_producto: string;
  producto_marca: string;
  producto_modelo: string;
  caracteristicas_tecnicas: string;
  reglamento_alcanzado: string;
  normas_tecnicas: string;
  numero_certificado: string;
  organismo_certificacion: string;
  esquema_certificacion: string;
  fecha_emision_certificado: string;
  fecha_proxima_vigilancia: string;
  laboratorio_ensayos: string;
  informe_ensayos: string;
  enlace_declaracion: string;
  fecha_lugar: string;
}

interface DJCPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  djcData: DJCPreviewData | null;
  onConfirm: () => void;
  isGenerating: boolean;
}

export const DJCPreviewModal: React.FC<DJCPreviewModalProps> = ({
  isOpen,
  onClose,
  djcData,
  onConfirm,
  isGenerating,
}) => {
  if (!isOpen || !djcData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Vista Previa DJC</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-2">
                DECLARACIÓN JURADA DE CONFORMIDAD (DJC)
              </h1>
              <p className="text-sm font-semibold">
                SEGÚN RESOLUCIÓN M.E.S.I.C. N° 237/2024, MODIFICACIONES Y COMPLEMENTOS
              </p>
            </div>

            <div className="space-y-4 text-sm">
              {/* Sección 1 */}
              <div className="bg-gray-700 text-white px-3 py-2 font-bold">
                (1) IDENTIFICACIÓN DE DECLARACIÓN DE CONFORMIDAD:{' '}
                {djcData.numero_djc}
              </div>

              {/* Sección 2 */}
              <div className="bg-gray-700 text-white px-3 py-2 font-bold">
                (2) INFORMACIÓN DEL FABRICANTE O IMPORTADOR
              </div>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50 w-1/3">
                      Razón Social
                    </td>
                    <td className="p-2">{djcData.razon_social}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">C.U.I.T.</td>
                    <td className="p-2">{djcData.cuit}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">
                      Nombre Comercial o Marca Registrada
                    </td>
                    <td className="p-2">{djcData.marca}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">
                      Domicilio legal
                    </td>
                    <td className="p-2">{djcData.domicilio_legal}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">
                      Domicilio de la planta de producción o del depósito del
                      importador
                    </td>
                    <td className="p-2">{djcData.domicilio_planta}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">Telefono</td>
                    <td className="p-2">
                      {djcData.telefono || (
                        <span className="text-red-600">VACIO</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold bg-gray-50">
                      Correo electrónico
                    </td>
                    <td className="p-2 text-blue-600">{djcData.email}</td>
                  </tr>
                </tbody>
              </table>

              {/* Sección 3 */}
              <div className="bg-gray-700 text-white px-3 py-2 font-bold">
                (3) REPRESENTANTE AUTORIZADO (SI FUERA APLICABLE)
              </div>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50 w-1/3">
                      Nombre y Apellido / Razón Social
                    </td>
                    <td className="p-2">
                      {djcData.representante_nombre || 'No aplica'}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">C.U.I.T.</td>
                    <td className="p-2">
                      {djcData.representante_cuit || 'No aplica'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold bg-gray-50">
                      Domicilio legal
                    </td>
                    <td className="p-2">
                      {djcData.representante_domicilio || 'No aplica'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Sección 4 */}
              <div className="bg-gray-700 text-white px-3 py-2 font-bold">
                (4) INFORMACIÓN DEL PRODUCTO
              </div>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50 w-1/3">
                      Código de identificación único del producto
                      (Autodeterminado)
                    </td>
                    <td className="p-2">{djcData.codigo_producto}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">
                      Fabricante (Nombre y dirección de la planta de producción)
                    </td>
                    <td className="p-2">{djcData.fabricante}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">
                      Identificación del producto
                    </td>
                    <td className="p-2">{djcData.identificacion_producto}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">Marca/s</td>
                    <td className="p-2">{djcData.producto_marca}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">Modelo/s</td>
                    <td className="p-2">{djcData.producto_modelo}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold bg-gray-50">
                      Características técnicas
                    </td>
                    <td className="p-2">{djcData.caracteristicas_tecnicas}</td>
                  </tr>
                </tbody>
              </table>

              {/* Sección 5 */}
              <div className="bg-gray-700 text-white px-3 py-2 font-bold">
                (5) NORMAS Y EVALUACIÓN DE LA CONFORMIDAD
              </div>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50 w-1/3">
                      Reglamento/s por el que se encuentra alcanzado
                    </td>
                    <td className="p-2">{djcData.reglamento_alcanzado}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50">
                      Norma/s Técnica/s
                    </td>
                    <td className="p-2">
                      {djcData.normas_tecnicas || (
                        <span className="text-red-600">VACIO</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td
                      className="p-2 font-semibold bg-gray-50 align-top"
                      rowSpan={7}
                    >
                      Referencia Certificado de conformidad emitido por Organismo
                      de Certificación
                    </td>
                    <td className="p-2">
                      <span className="font-semibold">N° de Certificado:</span>{' '}
                      {djcData.numero_certificado}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2">
                      <span className="font-semibold">
                        Organismo de Certificación:
                      </span>{' '}
                      {djcData.organismo_certificacion || (
                        <span className="text-red-600">VACIO</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2">
                      <span className="font-semibold">
                        Esquema de certificacion:
                      </span>{' '}
                      {djcData.esquema_certificacion || (
                        <span className="text-red-600">VACIO</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2">
                      <span className="font-semibold">
                        Fecha de emision (Certificado / Ultima Vigilancia):
                      </span>{' '}
                      {djcData.fecha_emision_certificado || (
                        <span className="text-red-600">VACIO</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2">
                      <span className="font-semibold">
                        Fecha de proxima vigilancia:
                      </span>{' '}
                      {djcData.fecha_proxima_vigilancia || (
                        <span className="text-red-600">VACIO</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2">
                      <span className="font-semibold">
                        Laboratorio de ensayos:
                      </span>{' '}
                      {djcData.laboratorio_ensayos || (
                        <span className="text-red-600">VACIO</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">
                      <span className="font-semibold">Informe de ensayos:</span>{' '}
                      {djcData.informe_ensayos || (
                        <span className="text-red-600">VACIO</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Sección 6 */}
              <div className="bg-gray-700 text-white px-3 py-2 font-bold">
                (6) OTROS DATOS
              </div>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr>
                    <td className="p-2 font-semibold bg-gray-50 w-1/3">
                      Enlace a la copia de la declaración de conformidad en
                      Internet
                    </td>
                    <td className="p-2 text-blue-600 break-all">
                      {djcData.enlace_declaracion && djcData.enlace_declaracion.trim() !== ''
                        ? djcData.enlace_declaracion
                        : ''}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 pt-4 border-t">
                <p className="text-[0.9375rem] text-justify mb-4 font-bold">
                  La presente declaración jurada de conformidad se emite, en todo
                  de acuerdo con el/los Reglamentos Técnicos aludidos
                  precedentemente, asumiendo la responsabilidad directa por los
                  datos declarados, así como por la conformidad del producto.
                </p>

                <div className="mt-4">
                  <p className="font-semibold">Fecha y Lugar:</p>
                  <p className="mb-4">{djcData.fecha_lugar}</p>

                  <p className="font-semibold">
                    Firma y Aclaracion del Apoderado Legal:
                  </p>
                  <div className="h-16 mt-12"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-4">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isGenerating}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generando y Guardando...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Confirmar y Generar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
