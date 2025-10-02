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

export class DJCPdfGenerator {
  private pdf: jsPDF;
  private pageWidth: number;
  private margin: number;
  private yPos: number;

  constructor() {
    this.pdf = new jsPDF();
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.margin = 15;
    this.yPos = 20;
  }

  private addHeader(djcData: DJCData) {
    // Título
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DECLARACIÓN JURADA DE CONFORMIDAD (DJC)', this.pageWidth / 2, this.yPos, { align: 'center' });

    this.yPos += 7;
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('SEGÚN RESOLUCIÓN M.E.S.I.C. N° 237/2024, MODIFICACIONES Y COMPLEMENTOS', this.pageWidth / 2, this.yPos, { align: 'center' });

    this.yPos += 10;
  }

  private addSectionHeader(title: string) {
    // Fondo gris
    this.pdf.setFillColor(64, 64, 64);
    this.pdf.rect(this.margin, this.yPos - 5, this.pageWidth - 2 * this.margin, 7, 'F');

    // Texto blanco
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, this.margin + 2, this.yPos, { maxWidth: this.pageWidth - 2 * this.margin - 4 });

    // Resetear color de texto
    this.pdf.setTextColor(0, 0, 0);
    this.yPos += 9;
  }

  private addTableRow(label: string, value: string, isGray: boolean = false, isHighlight: boolean = false) {
    const rowHeight = 8;
    const labelWidth = 70;
    const valueWidth = this.pageWidth - 2 * this.margin - labelWidth;

    // Fondo de la fila
    if (isGray) {
      this.pdf.setFillColor(245, 245, 245);
    } else if (isHighlight) {
      this.pdf.setFillColor(255, 255, 200); // Amarillo claro
    } else {
      this.pdf.setFillColor(255, 255, 255);
    }
    this.pdf.rect(this.margin, this.yPos - 5, this.pageWidth - 2 * this.margin, rowHeight, 'F');

    // Borde de la fila
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.rect(this.margin, this.yPos - 5, this.pageWidth - 2 * this.margin, rowHeight, 'S');

    // Texto de la etiqueta
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    const labelLines = this.pdf.splitTextToSize(label, labelWidth - 4);
    this.pdf.text(labelLines, this.margin + 2, this.yPos, { maxWidth: labelWidth - 4 });

    // Texto del valor
    this.pdf.setFont('helvetica', 'normal');

    // Verificar si el valor está vacío o es "CAMPO NO ENCONTRADO"
    if (!value || value.trim() === '') {
      this.pdf.setTextColor(255, 0, 0);
      this.pdf.text('CAMPO NO ENCONTRADO', this.margin + labelWidth + 2, this.yPos);
      this.pdf.setTextColor(0, 0, 0);
    } else {
      const valueLines = this.pdf.splitTextToSize(value, valueWidth - 4);
      this.pdf.text(valueLines, this.margin + labelWidth + 2, this.yPos, { maxWidth: valueWidth - 4 });
    }

    this.yPos += rowHeight;
  }

  private addMultiRowField(label: string, fields: { label: string; value: string; highlight?: boolean }[]) {
    const labelWidth = 70;
    const valueWidth = this.pageWidth - 2 * this.margin - labelWidth;
    const totalHeight = fields.length * 7;

    // Fondo gris para la etiqueta principal
    this.pdf.setFillColor(245, 245, 245);
    this.pdf.rect(this.margin, this.yPos - 5, labelWidth, totalHeight, 'F');

    // Borde para la etiqueta
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.rect(this.margin, this.yPos - 5, labelWidth, totalHeight, 'S');

    // Texto de la etiqueta principal
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    const labelLines = this.pdf.splitTextToSize(label, labelWidth - 4);
    this.pdf.text(labelLines, this.margin + 2, this.yPos, { maxWidth: labelWidth - 4 });

    // Agregar cada subfila
    let subYPos = this.yPos;
    fields.forEach((field, index) => {
      const rowHeight = 7;

      // Fondo de la subfila
      if (field.highlight) {
        this.pdf.setFillColor(255, 255, 200);
      } else {
        this.pdf.setFillColor(255, 255, 255);
      }
      this.pdf.rect(this.margin + labelWidth, subYPos - 5, valueWidth, rowHeight, 'F');

      // Borde de la subfila
      this.pdf.rect(this.margin + labelWidth, subYPos - 5, valueWidth, rowHeight, 'S');

      // Texto
      this.pdf.setFontSize(7);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(field.label + ': ', this.margin + labelWidth + 2, subYPos);

      this.pdf.setFont('helvetica', 'normal');
      const labelTextWidth = this.pdf.getTextWidth(field.label + ': ');

      if (!field.value || field.value.trim() === '') {
        this.pdf.setTextColor(255, 0, 0);
        this.pdf.text('CAMPO NO ENCONTRADO', this.margin + labelWidth + 2 + labelTextWidth, subYPos);
        this.pdf.setTextColor(0, 0, 0);
      } else {
        const valueText = this.pdf.splitTextToSize(field.value, valueWidth - labelTextWidth - 6);
        this.pdf.text(valueText, this.margin + labelWidth + 2 + labelTextWidth, subYPos, { maxWidth: valueWidth - labelTextWidth - 6 });
      }

      subYPos += rowHeight;
    });

    this.yPos += totalHeight;
  }

  private checkPageBreak(requiredSpace: number = 40) {
    if (this.yPos + requiredSpace > this.pdf.internal.pageSize.getHeight() - this.margin) {
      this.pdf.addPage();
      this.yPos = this.margin + 10;
    }
  }

  public generate(djcData: DJCData): jsPDF {
    // Encabezado
    this.addHeader(djcData);

    // Sección 1: Identificación
    this.addSectionHeader(`(1) IDENTIFICACIÓN DE DECLARACIÓN DE CONFORMIDAD: ${djcData.numero_djc}`);
    this.yPos += 2;

    // Sección 2: Fabricante/Importador
    this.checkPageBreak();
    this.addSectionHeader('(2) INFORMACIÓN DEL FABRICANTE O IMPORTADOR');
    this.addTableRow('Razón Social', djcData.razon_social, true);
    this.addTableRow('C.U.I.T.', djcData.cuit);
    this.addTableRow('Nombre Comercial o Marca Registrada', djcData.marca, true);
    this.addTableRow('Domicilio legal', djcData.domicilio_legal);
    this.addTableRow('Domicilio de la planta de producción o del depósito del importador', djcData.domicilio_planta, true);
    this.addTableRow('Telefono', djcData.telefono);
    this.addTableRow('Correo electrónico', djcData.email, true);
    this.yPos += 3;

    // Sección 3: Representante
    this.checkPageBreak();
    this.addSectionHeader('(3) REPRESENTANTE AUTORIZADO (SI FUERA APLICABLE)');
    this.addTableRow('Nombre y Apellido / Razón Social', djcData.representante_nombre || 'No aplica', true);
    this.addTableRow('C.U.I.T.', djcData.representante_cuit || 'No aplica');
    this.addTableRow('Domicilio legal', djcData.representante_domicilio || 'No aplica', true);
    this.yPos += 3;

    // Sección 4: Información del Producto
    this.checkPageBreak();
    this.addSectionHeader('(4) INFORMACIÓN DEL PRODUCTO');
    this.addTableRow('Código de identificación único del producto (Autodeterminado)', djcData.codigo_producto, true);
    this.addTableRow('Fabricante (Nombre y dirección de la planta de producción)', djcData.fabricante);
    this.addTableRow('Identificación del producto', djcData.identificacion_producto, true);
    this.addTableRow('Marca/s', djcData.producto_marca);
    this.addTableRow('Modelo/s', djcData.producto_modelo, true);
    this.addTableRow('Características técnicas', djcData.caracteristicas_tecnicas);
    this.yPos += 3;

    // Sección 5: Normas y Evaluación
    this.checkPageBreak(60);
    this.addSectionHeader('(5) NORMAS Y EVALUACIÓN DE LA CONFORMIDAD');
    this.addTableRow('Reglamento/s por el que se encuentra alcanzado', djcData.reglamento_alcanzado, true);
    this.addTableRow('Norma/s Técnica/s', djcData.normas_tecnicas);

    // Referencia al certificado (campo multilínea)
    this.addMultiRowField(
      'Referencia Certificado de conformidad emitido por Organismo de Certificación',
      [
        { label: 'N° de Certificado', value: djcData.numero_certificado },
        { label: 'Organismo de Certificación', value: djcData.organismo_certificacion },
        { label: 'Esquema de certificacion', value: djcData.esquema_certificacion, highlight: true },
        { label: 'Fecha de emision (Certificado / Ultima Vigilancia)', value: djcData.fecha_emision_certificado, highlight: true },
        { label: 'Fecha de proxima vigilancia', value: djcData.fecha_proxima_vigilancia, highlight: true },
        { label: 'Laboratorio de ensayos', value: djcData.laboratorio_ensayos, highlight: true },
        { label: 'Informe de ensayos', value: djcData.informe_ensayos, highlight: true }
      ]
    );
    this.yPos += 3;

    // Sección 6: Otros Datos
    this.checkPageBreak();
    this.addSectionHeader('(6) OTROS DATOS');
    this.addTableRow('Enlace a la copia de la declaración de conformidad en Internet', djcData.enlace_declaracion, true);
    this.yPos += 5;

    // Texto legal
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    const textoLegal = 'La presente declaración jurada de conformidad se emite, en todo de acuerdo con el/los Reglamentos Técnicos aludidos precedentemente, asumiendo la responsabilidad directa por los datos declarados, así como por la conformidad del producto.';
    const legalLines = this.pdf.splitTextToSize(textoLegal, this.pageWidth - 2 * this.margin);
    this.pdf.text(legalLines, this.margin, this.yPos);
    this.yPos += legalLines.length * 4 + 5;

    // Fecha y lugar
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Fecha y Lugar:', this.margin, this.yPos);
    this.yPos += 5;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(djcData.fecha_lugar, this.margin, this.yPos);
    this.yPos += 10;

    // Firma
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Firma y Aclaracion del Apoderado Legal:', this.margin, this.yPos);
    this.yPos += 20;

    // Línea para firma
    this.pdf.setDrawColor(100, 100, 100);
    this.pdf.line(this.margin, this.yPos, this.margin + 80, this.yPos);

    return this.pdf;
  }
}
