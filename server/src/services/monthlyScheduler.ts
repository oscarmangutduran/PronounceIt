import { getDb, saveDb } from '../db.js';
import { sendUsersPdfReportEmail, sendDeletedUsersPdfReportEmail } from './pdfReportService.js';

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
 * Comprueba si hoy es el día 31 o el último día del mes en curso
 * (para meses de 30 días como noviembre, o febrero de 28/29 días)
 */
export function isDay31OrLastDayOfMonth(d: Date): boolean {
  if (d.getDate() === 31) return true;
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return tomorrow.getDate() === 1;
}

/**
 * 1. PROGRAMACIÓN DÍA 1 DE CADA MES:
 * Comprueba si hoy es el día 1 del mes y envía el reporte PDF con los usuarios dados de alta
 * a hola@oscarmangutdev.es.
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
        message: `Hoy no es día 1 (día actual: ${now.getDate()}). El próximo envío mensual de altas se realizará el día 1 de ${now.toLocaleString('es-ES', { month: 'long' })}.`,
      };
    }

    if (alreadySentThisMonth) {
      return {
        triggered: false,
        message: `El informe mensual de altas de ${currentMonth} ya fue enviado previamente el ${meta.lastMonthlyReportDate}.`,
      };
    }
  }

  console.log(`\n🗓️ [MONTHLY SCHEDULER - DÍA 1] Iniciando envío de informe PDF de altas a ${TARGET_EMAIL}...`);
  const result = await sendUsersPdfReportEmail(TARGET_EMAIL);

  if (result.success) {
    db.appMeta = {
      ...(db.appMeta || {}),
      lastMonthlyReportSentMonth: currentMonth,
      lastMonthlyReportDate: new Date().toISOString(),
    };
    await saveDb();

    console.log(`✅ [MONTHLY SCHEDULER - DÍA 1] Informe PDF de altas entregado con éxito a ${TARGET_EMAIL}.\n`);
    return {
      triggered: true,
      message: `Informe mensual PDF de altas enviado con éxito a ${TARGET_EMAIL} (${result.totalUsers} usuarios incluidos).`,
    };
  } else {
    console.error(`❌ [MONTHLY SCHEDULER - DÍA 1] Error al enviar informe PDF de altas a ${TARGET_EMAIL}: ${result.message}`);
    return {
      triggered: false,
      message: `Error al enviar informe mensual de altas: ${result.message}`,
    };
  }
}

/**
 * 2. PROGRAMACIÓN DÍA 31 DE CADA MES (O FIN DE MES):
 * Comprueba si hoy es el día 31 (o último día del mes) y envía el reporte PDF con los
 * usuarios que se hayan dado de baja a hola@oscarmangutdev.es.
 */
export async function checkAndSendBajasReportIfDue(options?: { force?: boolean }): Promise<{
  triggered: boolean;
  message: string;
}> {
  const now = new Date();
  const isDay31OrEnd = isDay31OrLastDayOfMonth(now);
  const currentMonth = getCurrentMonthKey();

  const db = await getDb();
  const meta = db.appMeta || {};
  const alreadySentThisMonth = meta.lastBajasReportSentMonth === currentMonth;

  if (!options?.force) {
    if (!isDay31OrEnd) {
      return {
        triggered: false,
        message: `Hoy no es día 31 ni fin de mes (día actual: ${now.getDate()}). El próximo envío de bajas se realizará el día 31 de ${now.toLocaleString('es-ES', { month: 'long' })}.`,
      };
    }

    if (alreadySentThisMonth) {
      return {
        triggered: false,
        message: `El informe mensual de bajas de ${currentMonth} ya fue enviado previamente el ${meta.lastBajasReportDate}.`,
      };
    }
  }

  console.log(`\n🗓️ [MONTHLY SCHEDULER - DÍA 31] Iniciando envío de informe PDF de bajas a ${TARGET_EMAIL}...`);
  const result = await sendDeletedUsersPdfReportEmail(TARGET_EMAIL);

  if (result.success) {
    db.appMeta = {
      ...(db.appMeta || {}),
      lastBajasReportSentMonth: currentMonth,
      lastBajasReportDate: new Date().toISOString(),
    };
    await saveDb();

    console.log(`✅ [MONTHLY SCHEDULER - DÍA 31] Informe PDF de bajas entregado con éxito a ${TARGET_EMAIL}.\n`);
    return {
      triggered: true,
      message: `Informe PDF de bajas enviado con éxito a ${TARGET_EMAIL} (${result.totalUsers} cuentas dadas de baja).`,
    };
  } else {
    console.error(`❌ [MONTHLY SCHEDULER - DÍA 31] Error al enviar informe PDF de bajas a ${TARGET_EMAIL}: ${result.message}`);
    return {
      triggered: false,
      message: `Error al enviar informe de bajas: ${result.message}`,
    };
  }
}

/**
 * Inicializa el planificador automático mensual:
 * - Día 1 de cada mes: Envío de PDF con usuarios dados de alta.
 * - Día 31 de cada mes (fin de mes): Envío de PDF con usuarios dados de baja.
 */
export function initMonthlyScheduler(): void {
  // Comprobación inicial al arrancar el backend
  checkAndSendMonthlyReportIfDue().catch((err) => {
    console.error('[MONTHLY SCHEDULER] Error en comprobación de altas:', err);
  });

  checkAndSendBajasReportIfDue().catch((err) => {
    console.error('[MONTHLY SCHEDULER] Error en comprobación de bajas:', err);
  });

  // Comprobación periódica cada 60 minutos
  setInterval(() => {
    checkAndSendMonthlyReportIfDue().catch((err) => {
      console.error('[MONTHLY SCHEDULER] Error en comprobación de altas periódica:', err);
    });

    checkAndSendBajasReportIfDue().catch((err) => {
      console.error('[MONTHLY SCHEDULER] Error en comprobación de bajas periódica:', err);
    });
  }, 60 * 60 * 1000);

  console.log('🗓️ [MONTHLY SCHEDULER] Planificador mensual activo:');
  console.log('   - Día 1:  Envío automático de PDF de usuarios dados de alta.');
  console.log('   - Día 31: Envío automático de PDF de usuarios dados de baja.');
}
