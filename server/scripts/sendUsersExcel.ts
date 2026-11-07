import dotenv from 'dotenv';
dotenv.config();

import { initDb } from '../src/db.js';
import { sendUsersExcelReportEmail } from '../src/services/excelReportService.js';

async function main() {
  const targetEmail = process.argv[2] || 'hola@oscarmangutdev.es';

  console.log('======================================================');
  console.log(`📊 PronounceIt: Generando y Enviando Informe Excel`);
  console.log(`Destinatario: ${targetEmail}`);
  console.log('======================================================\n');

  await initDb();
  const result = await sendUsersExcelReportEmail(targetEmail);

  if (result.success) {
    console.log(`✅ ¡ÉXITO! ${result.message}`);
    console.log(`Archivo adjunto: ${result.filename}`);
    console.log(`Total de usuarios incluidos: ${result.totalUsers}`);
  } else {
    console.error(`❌ ERROR: ${result.message}`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('✅ Proceso finalizado correctamente.');
  console.log('======================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error fatal al enviar el informe Excel:', err);
  process.exit(1);
});
