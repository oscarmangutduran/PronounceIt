import { Router, Request, Response } from 'express';
import {
  checkAndNotifyVersionUpdate,
  getUpdateStatus,
  getCurrentAppVersion,
} from '../services/updateNotifierService.js';
import { sendNewVersionNotificationEmail } from '../services/emailService.js';
import {
  sendUsersExcelReportEmail,
  generateUsersExcelBuffer,
} from '../services/excelReportService.js';
import {
  sendUsersPdfReportEmail,
  generateUsersPdfBuffer,
} from '../services/pdfReportService.js';
import { checkAndSendMonthlyReportIfDue } from '../services/monthlyScheduler.js';

const router = Router();

/**
 * GET /api/updates/status
 * Devuelve el estado de la versión actual, última versión notificada y total de usuarios.
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await getUpdateStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (err: any) {
    console.error('Error al obtener estado de actualizaciones:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error interno' });
  }
});

/**
 * POST /api/updates/notify
 * Dispara el envío masivo de correo de actualización a todos los usuarios dados de alta.
 * Parámetros opcionales en el body:
 * - force: boolean (si es true, envía aunque la versión ya hubiera sido notificada)
 * - version: string (fuerza una versión específica)
 * - releaseNotes: string[] (novedades personalizadas)
 */
router.post('/notify', async (req: Request, res: Response) => {
  try {
    const { force = true, version, releaseNotes, apkUrl } = req.body || {};
    const result = await checkAndNotifyVersionUpdate({
      force: Boolean(force),
      version,
      releaseNotes,
      apkUrl,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Error al notificar actualización a los usuarios:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error interno' });
  }
});

/**
 * POST /api/updates/test-email
 * Envía un correo de prueba de nueva versión a una dirección específica para validar el diseño
 */
router.post('/test-email', async (req: Request, res: Response) => {
  try {
    const { to, username = 'Usuario de Prueba', version } = req.body || {};
    if (!to || !to.includes('@')) {
      return res.status(400).json({ success: false, error: 'Se requiere una dirección de correo válida en "to"' });
    }

    const currentVersion = version || (await getCurrentAppVersion());
    const ok = await sendNewVersionNotificationEmail(to, username, {
      version: currentVersion,
      apkUrl: `https://github.com/oscarmangutduran/PronounceIt/releases/download/v${currentVersion}/PronounceIt-v${currentVersion}.apk`,
      iosUrl: 'https://pronounceit-sand.vercel.app/apple',
      webUrl: 'https://pronounceit-sand.vercel.app/',
    });

    res.json({
      success: ok,
      message: ok
        ? `Correo de prueba de la versión v${currentVersion} enviado a ${to}`
        : `No se pudo enviar el correo a ${to}`,
    });
  } catch (err: any) {
    console.error('Error al enviar correo de prueba:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error interno' });
  }
});

/**
 * POST /api/updates/send-users-excel
 * Genera el archivo Excel (.xlsx) con todos los usuarios registrados y lo envía a hola@oscarmangutdev.es
 */
router.post('/send-users-excel', async (req: Request, res: Response) => {
  try {
    const { email = 'hola@oscarmangutdev.es' } = req.body || {};
    const result = await sendUsersExcelReportEmail(email);
    res.json(result);
  } catch (err: any) {
    console.error('Error al enviar informe Excel de usuarios:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error interno al generar/enviar Excel' });
  }
});

/**
 * GET /api/updates/download-users-excel
 * Descarga directamente el archivo Excel (.xlsx) en el navegador
 */
router.get('/download-users-excel', async (_req: Request, res: Response) => {
  try {
    const { buffer, filename } = await generateUsersExcelBuffer();
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err: any) {
    console.error('Error al descargar Excel de usuarios:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error al generar Excel' });
  }
});

/**
 * POST /api/updates/send-users-pdf
 * Genera el archivo PDF con los campos (Nombre, Email, Fecha de alta)
 * y lo envía por correo electrónico a hola@oscarmangutdev.es
 */
router.post('/send-users-pdf', async (req: Request, res: Response) => {
  try {
    const { email = 'hola@oscarmangutdev.es' } = req.body || {};
    const result = await sendUsersPdfReportEmail(email);
    res.json(result);
  } catch (err: any) {
    console.error('Error al enviar informe PDF de usuarios:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error interno al generar/enviar PDF' });
  }
});

/**
 * GET /api/updates/download-users-pdf
 * Descarga directamente el archivo PDF con los usuarios en el navegador
 */
router.get('/download-users-pdf', async (_req: Request, res: Response) => {
  try {
    const { buffer, filename } = await generateUsersPdfBuffer();
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
  } catch (err: any) {
    console.error('Error al descargar PDF de usuarios:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error al generar PDF' });
  }
});

/**
 * POST /api/updates/trigger-monthly-report
 * Permite forzar el disparo del informe mensual del día 1
 */
router.post('/trigger-monthly-report', async (_req: Request, res: Response) => {
  try {
    const result = await checkAndSendMonthlyReportIfDue({ force: true });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Error al disparar informe mensual:', err);
    res.status(500).json({ success: false, error: err?.message || 'Error interno' });
  }
});

export default router;
