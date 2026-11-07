import dotenv from 'dotenv';
dotenv.config();

import { initDb } from '../src/db.js';
import { sendDeletedUsersPdfReportEmail } from '../src/services/pdfReportService.js';

async function main() {
  const targetEmail = process.argv[2] || 'hola@oscarmangutdev.es';

  console.log('======================================================');
  console.log(`📄 PronounceIt: Informe Mensual de Bajas de Usuarios`);
  console.log(`Destinatario: ${targetEmail}`);
  console.log('Programación: Día 31 (fin de mes)');
  console.log('Campos: Nombre, Email, Fecha de alta, Fecha de baja');
  console.log('======================================================\n');

  await initDb();
  const result = await sendDeletedUsersPdfReportEmail(targetEmail);

  if (result.success) {
    console.log(`✅ ¡ÉXITO! ${result.message}`);
    console.log(`Archivo adjunto: ${result.filename}`);
    console.log(`Total de bajas incluidas: ${result.totalUsers}`);
  } else {
    console.error(`❌ ERROR: ${result.message}`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('✅ Proceso de generación y envío de PDF de bajas completado.');
  console.log('======================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error fatal al enviar el informe de bajas:', err);
  process.exit(1);
});

