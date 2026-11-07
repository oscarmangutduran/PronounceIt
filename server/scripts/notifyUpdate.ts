import dotenv from 'dotenv';
dotenv.config();

import { initDb } from '../src/db.js';
import { checkAndNotifyVersionUpdate, getUpdateStatus } from '../src/services/updateNotifierService.js';

async function main() {
  console.log('======================================================');
  console.log('🚀 PronounceIt: Enviando Notificación de Actualización');
  console.log('======================================================\n');

  await initDb();
  const statusBefore = await getUpdateStatus();
  console.log(`Versión actual de la app: v${statusBefore.currentVersion}`);
  console.log(`Usuarios dados de alta:    ${statusBefore.registeredUsersCount}`);
  console.log(`Última versión avisada:   ${statusBefore.lastNotifiedVersion || 'Ninguna'}\n`);

  // Force notification if run explicitly from CLI
  const result = await checkAndNotifyVersionUpdate({ force: true });
  console.log(`\nResultado: ${result.message}`);

  if (result.broadcastResult) {
    console.log(`\nDetalles del envío:`);
    console.table(
      result.broadcastResult.details.map((d) => ({
        Usuario: d.username,
        Correo: d.email,
        Estado: d.status === 'sent' ? '✅ Enviado' : '❌ Fallido',
        Error: d.error || '-',
      }))
    );
  }

  console.log('\n======================================================');
  console.log('✅ Proceso de notificación completado.');
  console.log('======================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error fatal al ejecutar la notificación:', err);
  process.exit(1);
});

