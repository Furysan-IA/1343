import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
    return '<span style="color: #dc2626; font-weight: bold;">CAMPO NO ENCONTRADO</span>';
  }
  // Si el valor es solo un guión, devolverlo tal cual (no es un error)
  if (value.trim() === '-') {
    return value;
  }
  return value;
};

export const generateDJCPdfFromHtml = async (djcData: DJCData): Promise<Blob> => {
  // Crear el HTML completo del documento
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          font-size: 9pt;
          line-height: 1.3;
          color: #000;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 20px;
        }

        .header h1 {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .header p {
          font-size: 9pt;
          font-weight: 600;
        }

        .section-header {
          background-color: #404040;
          color: white;
          padding: 5px 10px;
          font-weight: bold;
          margin-top: 10px;
          margin-bottom: 6px;
          font-size: 9pt;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }

        td {
          border: 1px solid #d1d5db;
          padding: 6px 8px;
          vertical-align: top;
          font-size: 8pt;
        }

        td.label {
          background-color: #f9fafb;
          font-weight: 600;
          width: 35%;
        }

        td.value {
          width: 65%;
        }

        td.sublabel {
          font-weight: 600;
          padding-left: 4px;
        }

        .footer-text {
          font-size: 9pt;
          margin: 20px 0;
          line-height: 1.6;
          padding: 12px;
          border: 2px solid #404040;
          background-color: #f9fafb;
          font-weight: bold;
        }

        .signature-section {
          margin-top: 30px;
        }

        .signature-line {
          border-bottom: 1px solid #000;
          width: 300px;
          margin-top: 50px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>DECLARACIÓN JURADA DE CONFORMIDAD (DJC)</h1>
        <p>SEGÚN RESOLUCIÓN M.E.S.I.C. N° 237/2024, MODIFICACIONES Y COMPLEMENTOS</p>
      </div>

      <div class="section-header">
        (1) IDENTIFICACIÓN DE DECLARACIÓN DE CONFORMIDAD: ${djcData.numero_djc}
      </div>

      <div class="section-header">
        (2) INFORMACIÓN DEL FABRICANTE O IMPORTADOR
      </div>
      <table>
        <tr>
          <td class="label">Razón Social</td>
          <td class="value">${djcData.razon_social}</td>
        </tr>
        <tr>
          <td class="label">C.U.I.T.</td>
          <td class="value">${djcData.cuit}</td>
        </tr>
        <tr>
          <td class="label">Nombre Comercial o Marca Registrada</td>
          <td class="value">${djcData.marca}</td>
        </tr>
        <tr>
          <td class="label">Domicilio legal</td>
          <td class="value">${djcData.domicilio_legal}</td>
        </tr>
        <tr>
          <td class="label">Domicilio de la planta de producción o del depósito del importador</td>
          <td class="value">${djcData.domicilio_planta}</td>
        </tr>
        <tr>
          <td class="label">Telefono</td>
          <td class="value">${formatFieldValue(djcData.telefono)}</td>
        </tr>
        <tr>
          <td class="label">Correo electrónico</td>
          <td class="value">${djcData.email}</td>
        </tr>
      </table>

      <div class="section-header">
        (3) REPRESENTANTE AUTORIZADO (SI FUERA APLICABLE)
      </div>
      <table>
        <tr>
          <td class="label">Nombre y Apellido / Razón Social</td>
          <td class="value">${djcData.representante_nombre || 'No aplica'}</td>
        </tr>
        <tr>
          <td class="label">C.U.I.T.</td>
          <td class="value">${djcData.representante_cuit || 'No aplica'}</td>
        </tr>
        <tr>
          <td class="label">Domicilio legal</td>
          <td class="value">${djcData.representante_domicilio || 'No aplica'}</td>
        </tr>
      </table>

      <div class="section-header">
        (4) INFORMACIÓN DEL PRODUCTO
      </div>
      <table>
        <tr>
          <td class="label">Código de identificación único del producto (Autodeterminado)</td>
          <td class="value">${djcData.codigo_producto}</td>
        </tr>
        <tr>
          <td class="label">Fabricante (Nombre y dirección de la planta de producción)</td>
          <td class="value">${djcData.fabricante}</td>
        </tr>
        <tr>
          <td class="label">Identificación del producto</td>
          <td class="value">${djcData.identificacion_producto}</td>
        </tr>
        <tr>
          <td class="label">Marca/s</td>
          <td class="value">${djcData.producto_marca}</td>
        </tr>
        <tr>
          <td class="label">Modelo/s</td>
          <td class="value">${djcData.producto_modelo}</td>
        </tr>
        <tr>
          <td class="label">Características técnicas</td>
          <td class="value">${djcData.caracteristicas_tecnicas}</td>
        </tr>
      </table>

      <div class="section-header">
        (5) NORMAS Y EVALUACIÓN DE LA CONFORMIDAD
      </div>
      <table>
        <tr>
          <td class="label">Reglamento/s por el que se encuentra alcanzado</td>
          <td class="value">${djcData.reglamento_alcanzado}</td>
        </tr>
        <tr>
          <td class="label">Norma/s Técnica/s</td>
          <td class="value">${formatFieldValue(djcData.normas_tecnicas)}</td>
        </tr>
        <tr>
          <td class="label" rowspan="6">Referencia Certificado de conformidad emitido por Organismo de Certificación</td>
          <td class="sublabel">N° de Certificado: <span style="font-weight: normal;">${djcData.numero_certificado}</span></td>
        </tr>
        <tr>
          <td class="sublabel">Organismo de Certificación: <span style="font-weight: normal;">${djcData.organismo_certificacion}</span></td>
        </tr>
        <tr>
          <td class="sublabel">Esquema de certificacion: <span style="font-weight: normal;">${formatFieldValue(djcData.esquema_certificacion)}</span></td>
        </tr>
        <tr>
          <td class="sublabel">Fecha de emision (Certificado / Ultima Vigilancia): <span style="font-weight: normal;">${formatFieldValue(djcData.fecha_emision_certificado)}</span></td>
        </tr>
        <tr>
          <td class="sublabel">Fecha de proxima vigilancia: <span style="font-weight: normal;">${formatFieldValue(djcData.fecha_proxima_vigilancia)}</span></td>
        </tr>
        <tr>
          <td class="sublabel">Laboratorio de ensayos: <span style="font-weight: normal;">${formatFieldValue(djcData.laboratorio_ensayos)}</span></td>
        </tr>
        <tr>
          <td class="label">Informe de ensayos:</td>
          <td class="value">${formatFieldValue(djcData.informe_ensayos)}</td>
        </tr>
      </table>

      <div class="section-header">
        (6) OTROS DATOS
      </div>
      <table>
        <tr>
          <td class="label">Enlace a la copia de la declaración de conformidad en Internet</td>
          <td class="value">${djcData.enlace_declaracion}</td>
        </tr>
      </table>

      <div class="footer-text">
        <p>La presente declaración jurada de conformidad se emite, en todo de acuerdo con el/los Reglamentos Técnicos aludidos precedentemente, asumiendo la responsabilidad directa por los datos declarados, así como por la conformidad del producto.</p>
      </div>

      <div class="signature-section">
        <p><strong>Fecha y Lugar:</strong></p>
        <p>${djcData.fecha_lugar}</p>
        <br><br>
        <p><strong>Firma y Aclaracion del Apoderado Legal:</strong></p>
        <div class="signature-line"></div>
      </div>
    </body>
    </html>
  `;

  // Crear un elemento temporal para renderizar el HTML
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.width = '700px'; // Ancho reducido para dejar márgenes
  element.style.backgroundColor = '#ffffff';
  document.body.appendChild(element);

  try {
    // Esperar un momento para que el DOM se renderice completamente
    await new Promise(resolve => setTimeout(resolve, 250));

    // Capturar el elemento como canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 700,
      height: element.scrollHeight
    });

    // Limpiar elemento del DOM
    document.body.removeChild(element);

    // Crear PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Calcular dimensiones con márgenes
    const margin = 15; // 15mm de margen lateral
    const marginTop = 15; // 15mm margen superior página 1
    const marginTopNext = 25; // 25mm margen superior páginas siguientes
    const imgWidth = 210 - (margin * 2); // 180mm de contenido
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = marginTop;

    // Agregar primera página con márgenes normales
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - marginTop - margin);

    // Agregar páginas adicionales con margen superior mayor
    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft) + marginTopNext;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - marginTopNext - margin);
    }

    // Convertir a blob
    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  } catch (error) {
    if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
    console.error('Error generando PDF:', error);
    throw error;
  }
};
