import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

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

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

export const generateDJCWithTemplate = async (
  data: DJCData,
  templateId?: string
): Promise<Blob> => {
  let template = null;
  if (templateId) {
    const templates = JSON.parse(localStorage.getItem('djc_templates') || '[]');
    template = templates.find((t: any) => t.id === templateId);
  }

  if (!template) {
    return generateDefaultPDF(data);
  }

  return generateCustomTemplatePDF(data, template);
};

const generateDefaultPDF = async (data: DJCData): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  const darkGray = [55, 65, 81];
  const lightGray = [243, 244, 246];
  const white = [255, 255, 255];
  const red = [239, 68, 68];

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DECLARACIÓN JURADA DE CONFORMIDAD (DJC)', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  pdf.setFontSize(10);
  pdf.text('SEGÚN RESOLUCIÓN M.E.S.I.C. N° 237/2024, MODIFICACIONES Y COMPLEMENTOS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  pdf.autoTable({
    startY: yPos,
    head: [[`(1) IDENTIFICACIÓN DE DECLARACIÓN DE CONFORMIDAD: ${data.numero_djc}`]],
    headStyles: {
      fillColor: darkGray,
      textColor: white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  yPos = pdf.lastAutoTable.finalY + 2;

  pdf.autoTable({
    startY: yPos,
    head: [['(2) INFORMACIÓN DEL FABRICANTE O IMPORTADOR']],
    headStyles: {
      fillColor: darkGray,
      textColor: white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    body: [
      ['Razón Social', data.razon_social || 'No especificado'],
      ['C.U.I.T.', data.cuit || 'No especificado'],
      ['Nombre Comercial o Marca Registrada', data.marca || 'No especificado'],
      ['Domicilio legal', data.domicilio_legal || 'No especificado'],
      ['Domicilio de la planta de producción o del depósito del importador', data.domicilio_planta || 'No especificado'],
      ['Telefono', data.telefono || 'CAMPO NO ENCONTRADO'],
      ['Correo electrónico', data.email || 'No especificado']
    ],
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', fillColor: lightGray },
      1: {
        cellWidth: 'auto'
      }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 1 && data.row.index === 5) {
        if (!data.cell.text[0] || data.cell.text[0] === 'CAMPO NO ENCONTRADO') {
          data.cell.styles.textColor = red;
        }
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  yPos = pdf.lastAutoTable.finalY + 2;

  pdf.autoTable({
    startY: yPos,
    head: [['(3) REPRESENTANTE AUTORIZADO (SI FUERA APLICABLE)']],
    headStyles: {
      fillColor: darkGray,
      textColor: white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    body: [
      ['Nombre y Apellido / Razón Social', data.representante_nombre || 'No aplica'],
      ['C.U.I.T.', data.representante_cuit || 'No aplica'],
      ['Domicilio legal', data.representante_domicilio || 'No aplica']
    ],
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', fillColor: lightGray },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  yPos = pdf.lastAutoTable.finalY + 2;

  pdf.autoTable({
    startY: yPos,
    head: [['(4) INFORMACIÓN DEL PRODUCTO']],
    headStyles: {
      fillColor: darkGray,
      textColor: white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    body: [
      ['Código de identificación único del producto (Autodeterminado)', data.codigo_producto || 'No especificado'],
      ['Fabricante (Nombre y dirección de la planta de producción)', data.fabricante || 'No especificado'],
      ['Identificación del producto', data.identificacion_producto || 'No especificado'],
      ['Marca/s', data.producto_marca || 'No especificado'],
      ['Modelo/s', data.producto_modelo || 'No especificado'],
      ['Características técnicas', data.caracteristicas_tecnicas || 'No especificado']
    ],
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', fillColor: lightGray },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  yPos = pdf.lastAutoTable.finalY + 2;

  const certificadoData = [
    ['N° de Certificado:', data.numero_certificado || 'CAMPO NO ENCONTRADO'],
    ['Organismo de Certificación:', data.organismo_certificacion || 'CAMPO NO ENCONTRADO'],
    ['Esquema de certificacion:', data.esquema_certificacion || 'CAMPO NO ENCONTRADO'],
    ['Fecha de emision (Certificado / Ultima Vigilancia):', data.fecha_emision_certificado || 'CAMPO NO ENCONTRADO'],
    ['Fecha de proxima vigilancia:', data.fecha_proxima_vigilancia || '-'],
    ['Laboratorio de ensayos:', data.laboratorio_ensayos || 'CAMPO NO ENCONTRADO'],
    ['Informe de ensayos:', data.informe_ensayos || 'CAMPO NO ENCONTRADO']
  ];

  pdf.autoTable({
    startY: yPos,
    head: [['(5) NORMAS Y EVALUACIÓN DE LA CONFORMIDAD']],
    headStyles: {
      fillColor: darkGray,
      textColor: white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    body: [
      ['Reglamento/s por el que se encuentra alcanzado', data.reglamento_alcanzado || 'No especificado'],
      ['Norma/s Técnica/s', data.normas_tecnicas || 'CAMPO NO ENCONTRADO']
    ],
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', fillColor: lightGray },
      1: {
        cellWidth: 'auto'
      }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 1 && data.row.index === 1) {
        if (!data.cell.text[0] || data.cell.text[0] === 'CAMPO NO ENCONTRADO') {
          data.cell.styles.textColor = red;
        }
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  yPos = pdf.lastAutoTable.finalY;

  pdf.autoTable({
    startY: yPos,
    body: [
      [
        {
          content: 'Referencia Certificado de conformidad emitido por Organismo de Certificación',
          rowSpan: 7,
          styles: { valign: 'top', fontStyle: 'bold', fillColor: lightGray, cellWidth: 70 }
        },
        { content: certificadoData[0][0] + ' ' + certificadoData[0][1], styles: { fontStyle: 'normal' } }
      ],
      ['', { content: certificadoData[1][0] + ' ' + certificadoData[1][1] }],
      ['', { content: certificadoData[2][0] + ' ' + certificadoData[2][1] }],
      ['', { content: certificadoData[3][0] + ' ' + certificadoData[3][1] }],
      ['', { content: certificadoData[4][0] + ' ' + certificadoData[4][1] }],
      ['', { content: certificadoData[5][0] + ' ' + certificadoData[5][1] }],
      ['', { content: certificadoData[6][0] + ' ' + certificadoData[6][1] }]
    ],
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 'auto' }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 1) {
        const text = data.cell.text[0] || '';
        if (text.includes('CAMPO NO ENCONTRADO')) {
          data.cell.styles.textColor = red;
        }
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  yPos = pdf.lastAutoTable.finalY + 2;

  pdf.autoTable({
    startY: yPos,
    head: [['(6) OTROS DATOS']],
    headStyles: {
      fillColor: darkGray,
      textColor: white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    body: [
      ['Enlace a la copia de la declaración de conformidad en Internet', data.enlace_declaracion || 'No especificado']
    ],
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', fillColor: lightGray, textColor: [0, 0, 0] },
      1: { cellWidth: 'auto', textColor: [37, 99, 235] }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  yPos = pdf.lastAutoTable.finalY + 5;

  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 20, 'F');
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 20, 'S');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  const declaracionText = 'La presente declaración jurada de conformidad se emite, en todo de acuerdo con el/los Reglamentos Técnicos aludidos precedentemente, asumiendo la responsabilidad directa por los datos declarados, así como por la conformidad del producto.';
  const declaracionLines = pdf.splitTextToSize(declaracionText, pageWidth - 2 * margin - 10);

  let declaracionY = yPos + 5;
  declaracionLines.forEach((line: string) => {
    pdf.text(line, margin + 5, declaracionY);
    declaracionY += 5;
  });

  yPos += 25;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Fecha y Lugar:', margin, yPos);
  yPos += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.fecha_lugar || new Date().toLocaleDateString('es-AR'), margin, yPos);
  yPos += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Firma y Aclaracion del Apoderado Legal:', margin, yPos);
  yPos += 15;
  pdf.line(margin, yPos, margin + 80, yPos);

  return pdf.output('blob');
};

const generateCustomTemplatePDF = async (data: DJCData, template: any): Promise<Blob> => {
  return generateDefaultPDF(data);
};

export { generateDefaultPDF };
