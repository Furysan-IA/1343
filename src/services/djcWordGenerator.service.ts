interface DJCData {
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

const formatFieldValue = (value: string | null | undefined): string => {
  if (!value || value.trim() === '') {
    return 'CAMPO NO ENCONTRADO';
  }
  return value;
};

const escapeRTF = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\par ')
    .replace(/á/g, "\\'e1")
    .replace(/é/g, "\\'e9")
    .replace(/í/g, "\\'ed")
    .replace(/ó/g, "\\'f3")
    .replace(/ú/g, "\\'fa")
    .replace(/ñ/g, "\\'f1")
    .replace(/Á/g, "\\'c1")
    .replace(/É/g, "\\'c9")
    .replace(/Í/g, "\\'cd")
    .replace(/Ó/g, "\\'d3")
    .replace(/Ú/g, "\\'da")
    .replace(/Ñ/g, "\\'d1")
    .replace(/°/g, "\\'b0");
};

export const generateDJCWord = async (djcData: DJCData): Promise<Blob> => {
  // Generar HTML limpio que Word pueda importar
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; margin: 2cm; }
        h1 { text-align: center; font-size: 14pt; margin-bottom: 5pt; }
        h2 { background-color: #404040; color: white; padding: 5pt; font-size: 11pt; margin-top: 15pt; margin-bottom: 5pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15pt; }
        td { border: 1px solid #d1d5db; padding: 5pt; }
        .label { font-weight: bold; background-color: #f9fafb; width: 35%; }
        .missing { color: #dc2626; font-weight: bold; }
        .legal { border: 2px solid #404040; background-color: #f9fafb; padding: 10pt; margin: 15pt 0; }
        .signature-line { border-top: 1px solid black; width: 200pt; margin-top: 40pt; }
      </style>
    </head>
    <body>
      <h1>DECLARACIÓN JURADA DE CONFORMIDAD (DJC)</h1>
      <p style="text-align: center; font-weight: bold;">SEGÚN RESOLUCIÓN M.E.S.I.C. N° 237/2024, MODIFICACIONES Y COMPLEMENTOS</p>

      <h2>(1) IDENTIFICACIÓN DE DECLARACIÓN DE CONFORMIDAD: ${escapeHTML(djcData.numero_djc)}</h2>

      <h2>(2) INFORMACIÓN DEL FABRICANTE O IMPORTADOR</h2>
      <table>
        <tr><td class="label">Razón Social</td><td>${escapeHTML(djcData.razon_social)}</td></tr>
        <tr><td class="label">C.U.I.T.</td><td>${escapeHTML(djcData.cuit)}</td></tr>
        <tr><td class="label">Nombre Comercial o Marca Registrada</td><td>${escapeHTML(djcData.marca)}</td></tr>
        <tr><td class="label">Domicilio legal</td><td>${escapeHTML(djcData.domicilio_legal)}</td></tr>
        <tr><td class="label">Domicilio de la planta de producción o del depósito del importador</td><td>${escapeHTML(djcData.domicilio_planta)}</td></tr>
        <tr><td class="label">Teléfono</td><td>${formatField(djcData.telefono)}</td></tr>
        <tr><td class="label">Correo electrónico</td><td>${escapeHTML(djcData.email)}</td></tr>
      </table>

      <h2>(3) REPRESENTANTE AUTORIZADO (SI FUERA APLICABLE)</h2>
      <table>
        <tr><td class="label">Nombre y Apellido / Razón Social</td><td>${escapeHTML(djcData.representante_nombre || 'No aplica')}</td></tr>
        <tr><td class="label">C.U.I.T.</td><td>${escapeHTML(djcData.representante_cuit || 'No aplica')}</td></tr>
        <tr><td class="label">Domicilio legal</td><td>${escapeHTML(djcData.representante_domicilio || 'No aplica')}</td></tr>
      </table>

      <h2>(4) INFORMACIÓN DEL PRODUCTO</h2>
      <table>
        <tr><td class="label">Código de identificación único del producto (Autodeterminado)</td><td>${escapeHTML(djcData.codigo_producto)}</td></tr>
        <tr><td class="label">Fabricante (Nombre y dirección de la planta de producción)</td><td>${escapeHTML(djcData.fabricante)}</td></tr>
        <tr><td class="label">Identificación del producto</td><td>${escapeHTML(djcData.identificacion_producto)}</td></tr>
        <tr><td class="label">Marca/s</td><td>${escapeHTML(djcData.producto_marca)}</td></tr>
        <tr><td class="label">Modelo/s</td><td>${escapeHTML(djcData.producto_modelo)}</td></tr>
        <tr><td class="label">Características técnicas</td><td>${escapeHTML(djcData.caracteristicas_tecnicas)}</td></tr>
      </table>

      <h2>(5) NORMAS Y EVALUACIÓN DE LA CONFORMIDAD</h2>
      <table>
        <tr><td class="label">Reglamento/s por el que se encuentra alcanzado</td><td>${escapeHTML(djcData.reglamento_alcanzado)}</td></tr>
        <tr><td class="label">Norma/s Técnica/s</td><td>${formatField(djcData.normas_tecnicas)}</td></tr>
        <tr>
          <td class="label" rowspan="7">Referencia Certificado de conformidad emitido por Organismo de Certificación</td>
          <td><strong>N° de Certificado:</strong> ${escapeHTML(djcData.numero_certificado)}</td>
        </tr>
        <tr><td><strong>Organismo de Certificación:</strong> ${formatField(djcData.organismo_certificacion)}</td></tr>
        <tr><td><strong>Esquema de certificacion:</strong> ${formatField(djcData.esquema_certificacion)}</td></tr>
        <tr><td><strong>Fecha de emision (Certificado / Ultima Vigilancia):</strong> ${formatField(djcData.fecha_emision_certificado)}</td></tr>
        <tr><td><strong>Fecha de proxima vigilancia:</strong> ${formatField(djcData.fecha_proxima_vigilancia)}</td></tr>
        <tr><td><strong>Laboratorio de ensayos:</strong> ${formatField(djcData.laboratorio_ensayos)}</td></tr>
        <tr><td><strong>Informe de ensayos:</strong> ${formatField(djcData.informe_ensayos)}</td></tr>
      </table>

      <h2>(6) OTROS DATOS</h2>
      <table>
        <tr><td class="label">Enlace a la copia de la declaración de conformidad en Internet</td><td>${escapeHTML(djcData.enlace_declaracion)}</td></tr>
      </table>

      <div class="legal">
        La presente declaración jurada de conformidad se emite, en todo de acuerdo con el/los Reglamentos Técnicos aludidos precedentemente, asumiendo la responsabilidad directa por los datos declarados, así como por la conformidad del producto.
      </div>

      <p><strong>Fecha y Lugar:</strong></p>
      <p>${escapeHTML(djcData.fecha_lugar)}</p>

      <p style="margin-top: 30pt;"><strong>Firma y Aclaración del Apoderado Legal:</strong></p>
      <div class="signature-line"></div>
    </body>
    </html>
  `;

  // Convertir HTML a Blob con tipo MIME de Word
  const blob = new Blob([htmlContent], {
    type: 'application/msword'
  });

  return blob;
};

function escapeHTML(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatField(value: string | null | undefined): string {
  if (!value || value.trim() === '') {
    return '<span class="missing">CAMPO NO ENCONTRADO</span>';
  }
  return escapeHTML(value);
}
