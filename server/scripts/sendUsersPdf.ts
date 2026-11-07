import dotenv from 'dotenv';
dotenv.config();

import { initDb } from '../src/db.js';
import { sendUsersPdfReportEmail } from '../src/services/pdfReportService.js';

async function main() {
  const targetEmail = process.argv[2] || 'hola@oscarmangutdev.es';

  console.log('======================================================');
  console.log(`📄 PronounceIt: Generando y Enviando Informe PDF`);
  console.log(`Destinatario: ${targetEmail}`);
  console.log('Campos: Nombre, Email, Fecha de alta');
  console.log('======================================================\n');

  await initDb();
  const result = await sendUsersPdfReportEmail(targetEmail);

  if (result.success) {
    console.log(`✅ ¡ÉXITO! ${result.message}`);
    console.log(`Archivo adjunto: ${result.filename}`);
    console.log(`Total de usuarios incluidos: ${result.totalUsers}`);
  } else {
    console.error(`❌ ERROR: ${result.message}`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('✅ Proceso de generación y envío de PDF completado.');
  console.log('======================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error fatal al enviar el informe PDF:', err);
  process.exit(1);
});
