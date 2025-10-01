// Script de diagnóstico para analizar codificaciones
// Ejecutar: node diagnostic-codificacion.js <archivo.xlsx>

const XLSX = require('xlsx');

if (process.argv.length < 3) {
  console.log('Uso: node diagnostic-codificacion.js <archivo.xlsx>');
  process.exit(1);
}

const filename = process.argv[2];
console.log('📁 Analizando archivo:', filename);

try {
  const workbook = XLSX.readFile(filename);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  const headers = data[0];
  const codIdx = headers.findIndex(h =>
    String(h).toLowerCase().includes('codif')
  );

  if (codIdx === -1) {
    console.error('❌ No se encontró columna de codificación');
    process.exit(1);
  }

  console.log('\n📊 ANÁLISIS DE CODIFICACIONES (primeros 30):');
  console.log('═'.repeat(100));

  for (let i = 1; i <= Math.min(30, data.length - 1); i++) {
    const row = data[i];
    const cod = row[codIdx];

    if (!cod) continue;

    // Normalización actual
    const normalized = String(cod)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');

    // Análisis byte por byte
    const bytes = [];
    for (let c of String(cod)) {
      bytes.push(c.charCodeAt(0));
    }

    console.log(`\n${i}. Original: "${cod}"`);
    console.log(`   Normalizado: "${normalized}"`);
    console.log(`   Bytes: [${bytes.join(', ')}]`);
    console.log(`   Longitud: ${String(cod).length} → ${normalized.length}`);

    // Detectar caracteres problemáticos
    const problems = [];
    if (/\r/.test(cod)) problems.push('Tiene \\r (carriage return)');
    if (/\n/.test(cod)) problems.push('Tiene \\n (newline)');
    if (/\t/.test(cod)) problems.push('Tiene \\t (tab)');
    if (/\u00A0/.test(cod)) problems.push('Tiene espacio no-break (\\u00A0)');
    if (/[\u2000-\u200F]/.test(cod)) problems.push('Tiene espacio Unicode especial');

    if (problems.length > 0) {
      console.log(`   ⚠️  PROBLEMAS: ${problems.join(', ')}`);
    }
  }

  console.log('\n═'.repeat(100));
  console.log('✅ Análisis completo');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
