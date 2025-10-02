import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export interface DJCData {
  numero_djc: string;
  resolucion: string;
  razon_social: string;
  cuit: string;
  marca: string;
  domicilio_legal: string;
  domicilio_planta: string;
  telefono: string;
  email: string;
  representante_nombre?: string;
  representante_domicilio?: string;
  representante_cuit?: string;
  codigo_producto: string;
  fabricante: string;
  identificacion_producto: string;
  producto_marca: string;
  producto_modelo: string;
  caracteristicas_tecnicas: string;
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

export const generateDJCPDF = (data: DJCData): Blob => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  const addSection = (title: string, content: [string, string][]) => {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFillColor(55, 65, 81);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 3, yPos + 5.5);
    yPos += 12;

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    content.forEach(([label, value]) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }

      const displayValue = value || 'NO ESPECIFICADO';
      const isError = !value;

      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}:`, margin, yPos);

      if (isError) {
        pdf.setTextColor(239, 68, 68);
      }

      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(displayValue, pageWidth - 2 * margin - 40);
      pdf.text(lines, margin + 40, yPos);

      pdf.setTextColor(0, 0, 0);
      yPos += Math.max(6, lines.length * 5);
    });

    yPos += 5;
  };

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('DECLARACIÓN JURADA DE CONFORMIDAD', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`DJC N°: ${data.numero_djc}`, pageWidth / 2, yPos, { align: 'center' });
  pdf.text(`Resolución: ${data.resolucion}`, pageWidth / 2, yPos + 7, { align: 'center' });
  yPos += 20;

  addSection('I. DATOS DEL FABRICANTE O IMPORTADOR', [
    ['Razón Social', data.razon_social],
    ['CUIT', data.cuit],
    ['Marca Comercial', data.marca],
    ['Domicilio Legal', data.domicilio_legal],
    ['Domicilio Planta', data.domicilio_planta],
    ['Teléfono', data.telefono],
    ['Email', data.email]
  ]);

  if (data.representante_nombre) {
    addSection('II. DATOS DEL REPRESENTANTE AUTORIZADO', [
      ['Nombre', data.representante_nombre],
      ['Domicilio', data.representante_domicilio || ''],
      ['CUIT', data.representante_cuit || '']
    ]);
  }

  addSection('III. IDENTIFICACIÓN DEL PRODUCTO', [
    ['Código de Producto', data.codigo_producto],
    ['Fabricante', data.fabricante],
    ['Identificación', data.identificacion_producto],
    ['Marca', data.producto_marca],
    ['Modelo', data.producto_modelo],
    ['Características Técnicas', data.caracteristicas_tecnicas]
  ]);

  addSection('IV. REGLAMENTOS Y NORMAS TÉCNICAS APLICABLES', [
    ['Reglamento', data.resolucion],
    ['Normas Técnicas', data.normas_tecnicas]
  ]);

  addSection('V. CERTIFICADO DE CONFORMIDAD', [
    ['Número de Certificado', data.numero_certificado],
    ['Organismo de Certificación', data.organismo_certificacion],
    ['Esquema de Certificación', data.esquema_certificacion],
    ['Fecha de Emisión', data.fecha_emision_certificado],
    ['Próxima Vigilancia', data.fecha_proxima_vigilancia]
  ]);

  addSection('VI. LABORATORIO Y DOCUMENTACIÓN', [
    ['Laboratorio de Ensayos', data.laboratorio_ensayos],
    ['Informe de Ensayo N°', data.informe_ensayos],
    ['Enlace a Declaración', data.enlace_declaracion]
  ]);

  if (yPos > 240) {
    pdf.addPage();
    yPos = 20;
  } else {
    yPos += 10;
  }

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'italic');
  pdf.text(data.fecha_lugar, margin, yPos);
  yPos += 15;

  pdf.setFont('helvetica', 'normal');
  pdf.line(margin, yPos, margin + 60, yPos);
  pdf.text('Firma y Aclaración', margin, yPos + 5);

  return pdf.output('blob');
};
