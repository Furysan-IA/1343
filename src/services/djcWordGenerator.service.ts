import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, ShadingType, HeadingLevel } from 'docx';

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
  if (value.trim() === '-') {
    return value;
  }
  return value;
};

const createSectionHeader = (text: string) => {
  return new Paragraph({
    text,
    shading: {
      type: ShadingType.SOLID,
      color: '404040',
    },
    spacing: {
      before: 200,
      after: 100,
    },
    style: 'heading2',
  });
};

const createTableRow = (label: string, value: string, isGray: boolean = false) => {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ text: label, style: 'tableLabel' })],
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: isGray ? {
          type: ShadingType.SOLID,
          color: 'F9FAFB',
        } : undefined,
      }),
      new TableCell({
        children: [new Paragraph({
          children: [
            new TextRun({
              text: value,
              color: (!value || value === 'CAMPO NO ENCONTRADO') ? 'DC2626' : undefined,
              bold: (!value || value === 'CAMPO NO ENCONTRADO') ? true : false,
            })
          ]
        })],
        width: { size: 65, type: WidthType.PERCENTAGE },
      }),
    ],
  });
};

export const generateDJCWord = async (djcData: DJCData): Promise<Blob> => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Encabezado
        new Paragraph({
          text: 'DECLARACIÓN JURADA DE CONFORMIDAD (DJC)',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'SEGÚN RESOLUCIÓN M.E.S.I.C. N° 237/2024, MODIFICACIONES Y COMPLEMENTOS',
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),

        // Sección 1
        createSectionHeader(`(1) IDENTIFICACIÓN DE DECLARACIÓN DE CONFORMIDAD: ${djcData.numero_djc}`),

        // Sección 2
        createSectionHeader('(2) INFORMACIÓN DEL FABRICANTE O IMPORTADOR'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          },
          rows: [
            createTableRow('Razón Social', djcData.razon_social, true),
            createTableRow('C.U.I.T.', djcData.cuit, false),
            createTableRow('Nombre Comercial o Marca Registrada', djcData.marca, true),
            createTableRow('Domicilio legal', djcData.domicilio_legal, false),
            createTableRow('Domicilio de la planta de producción o del depósito del importador', djcData.domicilio_planta, true),
            createTableRow('Telefono', formatFieldValue(djcData.telefono), false),
            createTableRow('Correo electrónico', djcData.email, true),
          ],
        }),

        // Sección 3
        createSectionHeader('(3) REPRESENTANTE AUTORIZADO (SI FUERA APLICABLE)'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          },
          rows: [
            createTableRow('Nombre y Apellido / Razón Social', djcData.representante_nombre || 'No aplica', true),
            createTableRow('C.U.I.T.', djcData.representante_cuit || 'No aplica', false),
            createTableRow('Domicilio legal', djcData.representante_domicilio || 'No aplica', true),
          ],
        }),

        // Sección 4
        createSectionHeader('(4) INFORMACIÓN DEL PRODUCTO'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          },
          rows: [
            createTableRow('Código de identificación único del producto (Autodeterminado)', djcData.codigo_producto, true),
            createTableRow('Fabricante (Nombre y dirección de la planta de producción)', djcData.fabricante, false),
            createTableRow('Identificación del producto', djcData.identificacion_producto, true),
            createTableRow('Marca/s', djcData.producto_marca, false),
            createTableRow('Modelo/s', djcData.producto_modelo, true),
            createTableRow('Características técnicas', djcData.caracteristicas_tecnicas, false),
          ],
        }),

        // Sección 5
        createSectionHeader('(5) NORMAS Y EVALUACIÓN DE LA CONFORMIDAD'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          },
          rows: [
            createTableRow('Reglamento/s por el que se encuentra alcanzado', djcData.reglamento_alcanzado, true),
            createTableRow('Norma/s Técnica/s', formatFieldValue(djcData.normas_tecnicas), false),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: 'Referencia Certificado de conformidad emitido por Organismo de Certificación', style: 'tableLabel' })],
                  width: { size: 35, type: WidthType.PERCENTAGE },
                  shading: { type: ShadingType.SOLID, color: 'F9FAFB' },
                  rowSpan: 7,
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'N° de Certificado: ', bold: true }),
                        new TextRun({ text: djcData.numero_certificado }),
                      ],
                    }),
                  ],
                  width: { size: 65, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Organismo de Certificación: ', bold: true }),
                        new TextRun({ text: formatFieldValue(djcData.organismo_certificacion) }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Esquema de certificacion: ', bold: true }),
                        new TextRun({ text: formatFieldValue(djcData.esquema_certificacion) }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Fecha de emision (Certificado / Ultima Vigilancia): ', bold: true }),
                        new TextRun({ text: formatFieldValue(djcData.fecha_emision_certificado) }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Fecha de proxima vigilancia: ', bold: true }),
                        new TextRun({ text: formatFieldValue(djcData.fecha_proxima_vigilancia) }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Laboratorio de ensayos: ', bold: true }),
                        new TextRun({ text: formatFieldValue(djcData.laboratorio_ensayos) }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Informe de ensayos: ', bold: true }),
                        new TextRun({ text: formatFieldValue(djcData.informe_ensayos) }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // Sección 6
        createSectionHeader('(6) OTROS DATOS'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          },
          rows: [
            createTableRow('Enlace a la copia de la declaración de conformidad en Internet', djcData.enlace_declaracion, true),
          ],
        }),

        // Texto legal
        new Paragraph({
          text: 'La presente declaración jurada de conformidad se emite, en todo de acuerdo con el/los Reglamentos Técnicos aludidos precedentemente, asumiendo la responsabilidad directa por los datos declarados, así como por la conformidad del producto.',
          spacing: { before: 300, after: 200 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 6, color: '404040' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '404040' },
            left: { style: BorderStyle.SINGLE, size: 6, color: '404040' },
            right: { style: BorderStyle.SINGLE, size: 6, color: '404040' },
          },
          shading: {
            type: ShadingType.SOLID,
            color: 'F9FAFB',
          },
        }),

        // Fecha y lugar
        new Paragraph({
          text: 'Fecha y Lugar:',
          bold: true,
          spacing: { before: 300 },
        }),
        new Paragraph({
          text: djcData.fecha_lugar,
          spacing: { after: 200 },
        }),

        // Firma
        new Paragraph({
          text: 'Firma y Aclaracion del Apoderado Legal:',
          bold: true,
          spacing: { before: 200, after: 400 },
        }),
        new Paragraph({
          text: '_______________________________________',
          spacing: { before: 600 },
        }),
      ],
    }],
    styles: {
      paragraphStyles: [
        {
          id: 'heading2',
          name: 'Heading 2',
          run: {
            color: 'FFFFFF',
            bold: true,
            size: 22,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        {
          id: 'tableLabel',
          name: 'Table Label',
          run: {
            bold: true,
            size: 20,
          },
        },
      ],
    },
  });

  const blob = await Packer.toBlob(doc);
  return blob;
};
