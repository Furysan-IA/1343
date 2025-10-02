import { Client, Product, MappingResult } from '@/types/upload.types';

export class DataMapper {
  private static COLUMN_MAPPING: Record<string, string[]> = {
    cuit: ['cuit', 'cuil', 'nro cuit', 'numero cuit', 'nro. cuit'],
    razon_social: ['razon_social', 'razon social', 'titular', 'empresa', 'nombre empresa', 'razón social'],
    direccion: ['direccion', 'dirección', 'domicilio', 'direccion legal', 'direccion_legal_empresa'],
    email: ['email', 'e-mail', 'correo', 'mail', 'correo electronico', 'correo electrónico'],
    telefono: ['telefono', 'teléfono', 'tel', 'tel.', 'celular'],
    contacto: ['contacto', 'persona contacto', 'nombre contacto'],
    codificacion: ['codificacion', 'codificación', 'codigo', 'código', 'cod', 'nro certificado', 'numero certificado'],
    tipo_certificacion: ['tipo_certificacion', 'tipo certificacion', 'tipo certificación', 'tipo'],
    estado: ['estado', 'status', 'vigencia'],
    fabricante: ['fabricante', 'manufacturer', 'productor'],
    planta_fabricacion: ['planta_fabricacion', 'planta fabricacion', 'planta fabricación', 'planta'],
    origen: ['origen', 'pais origen', 'país origen', 'procedencia'],
    producto: ['producto', 'product', 'item', 'descripcion', 'descripción'],
    marca: ['marca', 'brand'],
    modelo: ['modelo', 'model'],
    caracteristicas_tecnicas: ['caracteristicas_tecnicas', 'características técnicas', 'caracteristicas tecnicas', 'especificaciones'],
    normas_aplicacion: ['normas_aplicacion', 'normas aplicacion', 'normas aplicación', 'normas', 'normativa'],
    informe_ensayo_nro: ['informe_ensayo_nro', 'informe ensayo', 'nro informe', 'numero informe'],
    laboratorio: ['laboratorio', 'lab', 'laboratory'],
    ocp_extranjero: ['ocp_extranjero', 'ocp extranjero', 'organismo extranjero'],
    n_certificado_extranjero: ['n_certificado_extranjero', 'certificado extranjero', 'nro certificado extranjero'],
    fecha_emision_certificado_extranjero: ['fecha_emision_certificado_extranjero', 'fecha emision extranjero'],
    disposicion_convenio: ['disposicion_convenio', 'disposición convenio', 'convenio'],
    cod_rubro: ['cod_rubro', 'codigo rubro', 'código rubro', 'rubro'],
    cod_subrubro: ['cod_subrubro', 'codigo subrubro', 'código subrubro', 'subrubro'],
    nombre_subrubro: ['nombre_subrubro', 'nombre subrubro', 'desc subrubro'],
    fecha_emision: ['fecha_emision', 'fecha emision', 'fecha emisión', 'emision', 'emisión', 'fecha alta'],
    vencimiento: ['vencimiento', 'fecha_vencimiento', 'fecha vencimiento', 'valido hasta', 'válido hasta'],
    fecha_cancelacion: ['fecha_cancelacion', 'fecha cancelacion', 'fecha cancelación', 'cancelacion'],
    motivo_cancelacion: ['motivo_cancelacion', 'motivo cancelacion', 'motivo cancelación'],
    dias_para_vencer: ['dias_para_vencer', 'días para vencer', 'dias vencimiento'],
    organismo_certificacion: ['organismo_certificacion', 'organismo certificacion', 'organismo certificación', 'organismo'],
    esquema_certificacion: ['esquema_certificacion', 'esquema certificacion', 'esquema certificación', 'esquema']
  };

  static mapData(rows: any[], headers: string[]): MappingResult {
    console.log('🗺️ DataMapper - Iniciando mapeo...');
    console.log('📝 Total de filas:', rows.length);
    console.log('📋 Headers:', headers);

    const clients: Client[] = [];
    const products: Product[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const unmappedColumns: string[] = [];
    const clientMap = new Map<number, Client>();
    const productMap = new Map<string, Product>();

    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const headerMapping: Record<number, string> = {};

    normalizedHeaders.forEach((header, index) => {
      let mapped = false;
      for (const [dbField, variations] of Object.entries(this.COLUMN_MAPPING)) {
        if (variations.some(v => header.includes(v.toLowerCase()))) {
          headerMapping[index] = dbField;
          mapped = true;
          break;
        }
      }
      if (!mapped && header) {
        unmappedColumns.push(headers[index]);
      }
    });

    console.log('📊 Header Mapping creado:');
    console.log('  - Columnas mapeadas:', Object.keys(headerMapping).length);
    console.log('  - Columnas sin mapear:', unmappedColumns.length);
    console.log('  - Mapping:', headerMapping);

    const hasCodificacion = Object.values(headerMapping).includes('codificacion');
    const hasCuit = Object.values(headerMapping).includes('cuit');
    console.log(`  - ✓ Tiene columna CUIT: ${hasCuit}`);
    console.log(`  - ✓ Tiene columna CODIFICACION: ${hasCodificacion}`);

    rows.forEach((row, rowIndex) => {
      try {
        const mappedRow: any = {};

        // Mapear desde el objeto row usando los headers originales
        Object.entries(headerMapping).forEach(([colIndex, dbField]) => {
          const originalHeader = headers[parseInt(colIndex)];
          const value = row[originalHeader];
          if (value !== null && value !== undefined && value !== '') {
            mappedRow[dbField] = value;
          }
        });

        if (Object.keys(mappedRow).length === 0) {
          return;
        }

        const cuit = this.parseCUIT(mappedRow.cuit);
        if (!cuit) {
          console.warn(`❌ Fila ${rowIndex + 2}: CUIT inválido "${mappedRow.cuit}"`);
          errors.push(`Fila ${rowIndex + 2}: CUIT inválido o faltante: "${mappedRow.cuit}"`);
          return;
        }

        if (rowIndex < 3) {
          console.log(`🔍 Fila ${rowIndex + 2}: CUIT original="${mappedRow.cuit}" → parseado=${cuit}`);
        }

        if (!clientMap.has(cuit)) {
          const client: Client = {
            cuit,
            razon_social: mappedRow.razon_social || mappedRow.titular || 'No encontrado',
            direccion: mappedRow.direccion || mappedRow.direccion_legal_empresa || 'No encontrado',
            email: mappedRow.email || 'No encontrado',
            telefono: mappedRow.telefono,
            contacto: mappedRow.contacto
          };

          if (client.direccion === 'No encontrado' || client.email === 'No encontrado') {
            warnings.push(`Fila ${rowIndex + 2}: Cliente ${client.razon_social} tiene datos faltantes`);
          }

          clientMap.set(cuit, client);
          if (rowIndex < 3) {
            console.log(`👤 Cliente agregado al mapa: CUIT=${cuit}, Razón Social=${client.razon_social}`);
          }
        }

        const codificacion = mappedRow.codificacion?.toString().trim();

        if (rowIndex < 3) {
          console.log(`🔍 Fila ${rowIndex + 2}: codificacion="${codificacion}", existe en mapa=${productMap.has(codificacion || '')}, mappedRow.codificacion="${mappedRow.codificacion}"`);
        }

        if (codificacion && !productMap.has(codificacion)) {
          const product: Product = {
            codificacion,
            cuit,
            titular: mappedRow.razon_social || mappedRow.titular,
            tipo_certificacion: mappedRow.tipo_certificacion,
            estado: mappedRow.estado,
            fabricante: mappedRow.fabricante,
            planta_fabricacion: mappedRow.planta_fabricacion,
            origen: mappedRow.origen,
            producto: mappedRow.producto,
            marca: mappedRow.marca,
            modelo: mappedRow.modelo,
            caracteristicas_tecnicas: mappedRow.caracteristicas_tecnicas,
            normas_aplicacion: mappedRow.normas_aplicacion,
            informe_ensayo_nro: mappedRow.informe_ensayo_nro,
            laboratorio: mappedRow.laboratorio,
            ocp_extranjero: mappedRow.ocp_extranjero,
            n_certificado_extranjero: mappedRow.n_certificado_extranjero,
            fecha_emision_certificado_extranjero: this.parseDate(mappedRow.fecha_emision_certificado_extranjero),
            disposicion_convenio: mappedRow.disposicion_convenio,
            cod_rubro: mappedRow.cod_rubro ? Number(mappedRow.cod_rubro) : undefined,
            cod_subrubro: mappedRow.cod_subrubro ? Number(mappedRow.cod_subrubro) : undefined,
            nombre_subrubro: mappedRow.nombre_subrubro,
            fecha_emision: this.parseDate(mappedRow.fecha_emision),
            vencimiento: this.parseDate(mappedRow.vencimiento),
            fecha_cancelacion: this.parseDate(mappedRow.fecha_cancelacion),
            motivo_cancelacion: mappedRow.motivo_cancelacion,
            dias_para_vencer: mappedRow.dias_para_vencer ? Number(mappedRow.dias_para_vencer) : undefined,
            organismo_certificacion: mappedRow.organismo_certificacion,
            esquema_certificacion: mappedRow.esquema_certificacion
          };

          productMap.set(codificacion, product);
          if (rowIndex < 3) {
            console.log(`📦 Producto agregado al mapa: ${codificacion} (CUIT: ${cuit}, Producto: ${product.producto})`);
          }
        } else if (!codificacion) {
          if (rowIndex < 3) {
            console.warn(`⚠️ Fila ${rowIndex + 2}: codificacion vacía o faltante en mappedRow`);
          }
        } else if (productMap.has(codificacion)) {
          if (rowIndex < 3) {
            console.log(`⏭️ Fila ${rowIndex + 2}: producto ${codificacion} ya existe en mapa, saltando`);
          }
        }
      } catch (error) {
        errors.push(`Fila ${rowIndex + 2}: Error al procesar - ${error.message}`);
      }
    });

    const finalClients = Array.from(clientMap.values());
    const finalProducts = Array.from(productMap.values());

    console.log('✅ Mapeo completado:');
    console.log('  - Clientes únicos:', finalClients.length);
    console.log('  - Productos únicos:', finalProducts.length);
    console.log('  - Errores:', errors.length);
    console.log('  - Warnings:', warnings.length);
    console.log('  - Columnas sin mapear:', unmappedColumns.length);

    return {
      clients: finalClients,
      products: finalProducts,
      errors,
      warnings,
      unmappedColumns
    };
  }

  private static parseCUIT(value: any): number | null {
    if (!value) return null;

    // Convertir a string y limpiar guiones, espacios y cualquier caracter no numérico
    let cleaned = String(value)
      .replace(/[-\s_\/\\.]/g, '')  // Eliminar guiones, espacios, guiones bajos, barras y puntos
      .trim();

    // Si es un número flotante de Excel, quitar los decimales
    if (cleaned.includes('.')) {
      cleaned = cleaned.split('.')[0];
    }

    const num = parseInt(cleaned, 10);

    // Validar que sea un número y tenga 10-11 dígitos (formato CUIT argentino)
    if (isNaN(num) || cleaned.length < 10 || cleaned.length > 11) {
      console.warn(`⚠️ CUIT inválido: "${value}" → cleaned="${cleaned}" (length=${cleaned.length})`);
      return null;
    }

    return num;
  }

  private static parseDate(value: any): Date | undefined {
    if (!value) return undefined;

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return isNaN(date.getTime()) ? undefined : date;
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
