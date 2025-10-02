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

  private addTableRow(label: string, value: string, isGray: boolean = false, allowEmpty: boolean = false) {
    const labelWidth = 70;
    const valueWidth = this.pageWidth - 2 * this.margin - labelWidth;
    const lineHeight = 4;
    const minRowHeight = 9;
    const topPadding = 2.5;
    const bottomPadding = 2.5;

    // Preparar texto de la etiqueta
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    const labelLines = this.pdf.splitTextToSize(label, labelWidth - 6);

    // Preparar texto del valor
    this.pdf.setFont('helvetica', 'normal');
    let valueLines: string[] = [];
    const isEmpty = !value || value.trim() === '';

    if (isEmpty && !allowEmpty) {
      valueLines = ['VACIO'];
    } else if (isEmpty && allowEmpty) {
      valueLines = [''];
    } else {
      valueLines = this.pdf.splitTextToSize(value, valueWidth - 6);
    }

    // Calcular altura dinámica basada en el contenido
    const labelHeight = labelLines.length * lineHeight + topPadding + bottomPadding;
    const valueHeight = valueLines.length * lineHeight + topPadding + bottomPadding;
    const rowHeight = Math.max(minRowHeight, labelHeight, valueHeight);

    // Fondo de la fila
    if (isGray) {
      this.pdf.setFillColor(245, 245, 245);
    } else {
      this.pdf.setFillColor(255, 255, 255);
    }
    this.pdf.rect(this.margin, this.yPos, this.pageWidth - 2 * this.margin, rowHeight, 'F');

    // Borde de la fila
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.rect(this.margin, this.yPos, this.pageWidth - 2 * this.margin, rowHeight, 'S');

    // Texto de la etiqueta - centrado verticalmente
    this.pdf.setFont('helvetica', 'bold');
    const labelContentHeight = labelLines.length * lineHeight;
    const labelStartY = this.yPos + (rowHeight - labelContentHeight) / 2 + 3.8;
    labelLines.forEach((line, index) => {
      this.pdf.text(line, this.margin + 3, labelStartY + (index * lineHeight));
    });

    // Texto del valor - centrado verticalmente
    this.pdf.setFont('helvetica', 'normal');
    if (isEmpty && !allowEmpty) {
      this.pdf.setTextColor(255, 0, 0);
      const valueStartY = this.yPos + (rowHeight / 2) + 3.3;
      this.pdf.text('VACIO', this.margin + labelWidth + 3, valueStartY);
      this.pdf.setTextColor(0, 0, 0);
    } else if (!isEmpty || allowEmpty) {
      const valueContentHeight = valueLines.length * lineHeight;
      const valueStartY = this.yPos + (rowHeight - valueContentHeight) / 2 + 3.8;
      valueLines.forEach((line, index) => {
        if (line.trim() !== '' || !isEmpty) {
          this.pdf.text(line, this.margin + labelWidth + 3, valueStartY + (index * lineHeight));
        }
      });
    }

    this.yPos += rowHeight;
  }

   private addMultiRowField(label: string, fields: { label: string; value: string }[]) {
    const labelWidth = 70;
    const valueWidth = this.pageWidth - 2 * this.margin - labelWidth;
    const lineHeight = 4;
    const minSubRowHeight = 9;
    const topPadding = 2.5;
    const bottomPadding = 2.5;

    // Calcular alturas de cada subfila
    this.pdf.setFontSize(8);
    const subRowHeights: number[] = [];
    let totalHeight = 0;

    fields.forEach(field => {
      this.pdf.setFont('helvetica', 'bold');
      const labelTextWidth = this.pdf.getTextWidth(field.label + ': ');

      this.pdf.setFont('helvetica', 'normal');
      const availableWidth = valueWidth - labelTextWidth - 6;

      let valueLines: string[] = [];
      if (!field.value || field.value.trim() === '') {
        valueLines = ['VACIO'];
      } else {
        valueLines = this.pdf.splitTextToSize(field.value, availableWidth);
      }

      const subRowHeight = Math.max(minSubRowHeight, valueLines.length * lineHeight + topPadding + bottomPadding);
      subRowHeights.push(subRowHeight);
      totalHeight += subRowHeight;
    });

    // Fondo gris para la etiqueta principal
    this.pdf.setFillColor(245, 245, 245);
    this.pdf.rect(this.margin, this.yPos, labelWidth, totalHeight, 'F');

    // Borde para la etiqueta
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.rect(this.margin, this.yPos, labelWidth, totalHeight, 'S');

    // Texto de la etiqueta principal - centrado verticalmente
    this.pdf.setFont('helvetica', 'bold');
    const labelLines = this.pdf.splitTextToSize(label, labelWidth - 6);
    const labelContentHeight = labelLines.length * lineHeight;
    const labelStartY = this.yPos + (totalHeight - labelContentHeight) / 2 + 3.8;
    labelLines.forEach((line, index) => {
      this.pdf.text(line, this.margin + 3, labelStartY + (index * lineHeight));
    });

    // Agregar cada subfila
    let subYPos = this.yPos;
    fields.forEach((field, index) => {
      const subRowHeight = subRowHeights[index];

      // Fondo blanco uniforme para todas las subfilas
      this.pdf.setFillColor(255, 255, 255);
      this.pdf.rect(this.margin + labelWidth, subYPos, valueWidth, subRowHeight, 'F');

      // Borde de la subfila
      this.pdf.rect(this.margin + labelWidth, subYPos, valueWidth, subRowHeight, 'S');

      // Calcular ancho de la etiqueta del campo
      this.pdf.setFont('helvetica', 'bold');
      const labelTextWidth = this.pdf.getTextWidth(field.label + ': ');

      // Texto del valor
      this.pdf.setFont('helvetica', 'normal');
      const availableWidth = valueWidth - labelTextWidth - 6;

      if (!field.value || field.value.trim() === '') {
        // Centrar verticalmente el texto de una línea
        const textStartY = subYPos + (subRowHeight / 2) + 3.3;
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(field.label + ': ', this.margin + labelWidth + 3, textStartY);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(255, 0, 0);
        this.pdf.text('VACIO', this.margin + labelWidth + 3 + labelTextWidth, textStartY);
        this.pdf.setTextColor(0, 0, 0);
      } else {
        const valueLines = this.pdf.splitTextToSize(field.value, availableWidth);
        const contentHeight = valueLines.length * lineHeight;
        const textStartY = subYPos + (subRowHeight - contentHeight) / 2 + 3.8;

        // Dibujar etiqueta en la misma línea que el primer valor
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(field.label + ': ', this.margin + labelWidth + 3, textStartY);

        // Dibujar valores
        this.pdf.setFont('helvetica', 'normal');
        valueLines.forEach((line, lineIndex) => {
          this.pdf.text(line, this.margin + labelWidth + 3 + labelTextWidth, textStartY + (lineIndex * lineHeight));
        });
      }

      subYPos += subRowHeight;
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
        { label: 'Esquema de certificacion', value: djcData.esquema_certificacion },
        { label: 'Fecha de emision (Certificado / Ultima Vigilancia)', value: djcData.fecha_emision_certificado },
        { label: 'Fecha de proxima vigilancia', value: djcData.fecha_proxima_vigilancia },
        { label: 'Laboratorio de ensayos', value: djcData.laboratorio_ensayos },
        { label: 'Informe de ensayos', value: djcData.informe_ensayos }
      ]
    );
    this.yPos += 3;

    // Sección 6: Otros Datos
    this.checkPageBreak();
    this.addSectionHeader('(6) OTROS DATOS');
    this.addTableRow('Enlace a la copia de la declaración de conformidad en Internet', djcData.enlace_declaracion, true, true);
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
