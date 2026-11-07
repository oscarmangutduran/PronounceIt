import { getDb, saveDb } from '../db.js';
import { sendUsersPdfReportEmail } from './pdfReportService.js';

const TARGET_EMAIL = 'hola@oscarmangutdev.es';

/**
 * Obtiene la clave del mes actual, e.g. "2026-11"
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Comprueba si hoy es el día 1 del mes y si aún no se ha enviado el reporte mensual de este mes.
 * En caso afirmativo, genera el PDF y lo envía a hola@oscarmangutdev.es.
 */
export async function checkAndSendMonthlyReportIfDue(options?: { force?: boolean }): Promise<{
  triggered: boolean;
  message: string;
}> {
  const now = new Date();
  const isDayOne = now.getDate() === 1;
  const currentMonth = getCurrentMonthKey();

  const db = await getDb();
  const meta = db.appMeta || {};
  const alreadySentThisMonth = meta.lastMonthlyReportSentMonth === currentMonth;

  if (!options?.force) {
    if (!isDayOne) {
      return {
        triggered: false,
        message: `Hoy no es día 1 (día actual: ${now.getDate()}). El próximo envío mensual se realizará el día 1 de ${now.toLocaleString('es-ES', { month: 'long' })}.`,
      };
    }

    if (alreadySentThisMonth) {
      return {
        triggered: false,
        message: `El informe mensual de ${currentMonth} ya fue enviado previamente el ${meta.lastMonthlyReportDate}.`,
      };
    }
  }

  console.log(`\n🗓️ [MONTHLY SCHEDULER] Iniciando envío de informe PDF mensual a ${TARGET_EMAIL}...`);
  const result = await sendUsersPdfReportEmail(TARGET_EMAIL);

  if (result.success) {
    db.appMeta = {
      ...(db.appMeta || {}),
      lastMonthlyReportSentMonth: currentMonth,
      lastMonthlyReportDate: new Date().toISOString(),
    };
    await saveDb();

    console.log(`✅ [MONTHLY SCHEDULER] Informe PDF mensual entregado con éxito a ${TARGET_EMAIL}.\n`);
    return {
      triggered: true,
      message: `Informe mensual PDF enviado con éxito a ${TARGET_EMAIL} (${result.totalUsers} usuarios incluidos).`,
    };
  } else {
    console.error(`❌ [MONTHLY SCHEDULER] Error al enviar informe PDF mensual a ${TARGET_EMAIL}: ${result.message}`);
    return {
      triggered: false,
      message: `Error al enviar informe mensual: ${result.message}`,
    };
  }
}

/**
 * Inicializa el planificador automático mensual:
 * 1. Comprueba inmediatamente al arrancar el servidor si corresponde enviar el informe.
 * 2. Comprueba cada hora de forma continua.
 */
export function initMonthlyScheduler(): void {
  // Comprobación inicial al arrancar el backend
  checkAndSendMonthlyReportIfDue().catch((err) => {
    console.error('[MONTHLY SCHEDULER] Error en comprobación inicial:', err);
  });

  // Comprobación periódica cada 60 minutos
  setInterval(() => {
    checkAndSendMonthlyReportIfDue().catch((err) => {
      console.error('[MONTHLY SCHEDULER] Error en comprobación periódica:', err);
    });
  }, 60 * 60 * 1000);

  console.log('🗓️ [MONTHLY SCHEDULER] Planificador mensual de informes PDF activo (Envío automático: Día 1 de cada mes).');
}
