import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, saveDb } from '../db.js';
import { broadcastNewVersionEmail, NewVersionInfo, BroadcastResult } from './emailService.js';
import { sendUsersExcelReportEmail } from './excelReportService.js';
import { sendUsersPdfReportEmail } from './pdfReportService.js';

function getDirname(): string {
  try {
    if (typeof __dirname !== 'undefined' && __dirname) {
      return __dirname;
    }
  } catch {}
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.url) {
      // @ts-ignore
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}
  return process.cwd();
}

/**
 * Reads the current app version from server or root package.json
 */
export async function getCurrentAppVersion(): Promise<string> {
  if (process.env.APP_VERSION && process.env.APP_VERSION.trim()) {
    return process.env.APP_VERSION.trim();
  }

  const currentDir = getDirname();
  const candidates = [
    path.resolve(currentDir, '../../package.json'),
    path.resolve(currentDir, '../package.json'),
    path.resolve(process.cwd(), 'client/package.json'),
    path.resolve(process.cwd(), 'package.json'),
  ];

  for (const p of candidates) {
    try {
      const content = await fs.readFile(p, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.version) {
        return parsed.version;
      }
    } catch {}
  }

  return '1.7.1';
}

export interface CheckAndUpdateResult {
  triggered: boolean;
  message: string;
  version: string;
  broadcastResult?: BroadcastResult;
  lastNotifiedVersion?: string;
  lastNotificationDate?: string;
}

/**
 * Comprueba si la versión actual es más reciente que la última notificada.
 * Si es así (o si options.force es true), envía el correo a todos los usuarios dados de alta
 * y guarda la versión en el registro de la base de datos.
 */
export async function checkAndNotifyVersionUpdate(options?: {
  force?: boolean;
  version?: string;
  releaseNotes?: string[];
  apkUrl?: string;
}): Promise<CheckAndUpdateResult> {
  const db = await getDb();
  const currentVersion = options?.version || (await getCurrentAppVersion());
  const meta = db.appMeta || {};

  const alreadyNotified = meta.lastNotifiedVersion === currentVersion;
  if (!options?.force && alreadyNotified) {
    return {
      triggered: false,
      message: `La versión ${currentVersion} ya fue notificada previamente a los usuarios (${meta.lastNotificationDate || 'reciente'}).`,
      version: currentVersion,
      lastNotifiedVersion: meta.lastNotifiedVersion,
      lastNotificationDate: meta.lastNotificationDate,
    };
  }

  const versionInfo: NewVersionInfo = {
    version: currentVersion,
    apkUrl:
      options?.apkUrl ||
      `https://github.com/oscarmangutduran/PronounceIt/releases/download/v${currentVersion}/PronounceIt-v${currentVersion}.apk`,
    iosUrl: 'https://pronounceit-sand.vercel.app/apple',
    webUrl: 'https://pronounceit-sand.vercel.app/',
    releaseNotes:
      options?.releaseNotes && options.releaseNotes.length > 0
        ? options.releaseNotes
        : [
            'Evaluación interactiva de tests por categoría y subcategoría de vocabulario',
            'Nuevo logotipo e icono oficial integrado en toda la plataforma',
            'Enrutamiento universal en castellano (/flashcards, /test, /estadisticas, /configuracion)',
            'Optimización de rendimiento y sincronización offline-first con la nube',
          ],
  };

  const broadcastResult = await broadcastNewVersionEmail(versionInfo);

  // Enviar automáticamente el informe PDF con los usuarios registrados a hola@oscarmangutdev.es
  sendUsersPdfReportEmail('hola@oscarmangutdev.es').catch((err) => {
    console.error('Error al enviar informe PDF adjunto a hola@oscarmangutdev.es:', err);
  });

  // Actualizar metadatos en la base de datos
  const now = new Date().toISOString();
  db.appMeta = {
    lastNotifiedVersion: currentVersion,
    lastNotificationDate: now,
    notificationHistory: [
      ...(db.appMeta?.notificationHistory || []),
      {
        version: currentVersion,
        sentAt: now,
        recipientCount: broadcastResult.totalUsers,
        successCount: broadcastResult.sentCount,
      },
    ],
  };
  await saveDb();

  return {
    triggered: true,
    message: `Notificación de la versión v${currentVersion} enviada a ${broadcastResult.sentCount} de ${broadcastResult.totalUsers} usuarios registrados.`,
    version: currentVersion,
    broadcastResult,
    lastNotifiedVersion: currentVersion,
    lastNotificationDate: now,
  };
}

/**
 * Devuelve el estado actual de versiones y notificaciones
 */
export async function getUpdateStatus() {
  const db = await getDb();
  const currentVersion = await getCurrentAppVersion();
  const meta = db.appMeta || {};
  const usersCount = (db.users || []).length;

  return {
    currentVersion,
    lastNotifiedVersion: meta.lastNotifiedVersion || null,
    lastNotificationDate: meta.lastNotificationDate || null,
    registeredUsersCount: usersCount,
    downloadApkUrl: `https://github.com/oscarmangutduran/PronounceIt/releases/download/v${currentVersion}/PronounceIt-v${currentVersion}.apk`,
    webUrl: 'https://pronounceit-sand.vercel.app/',
    history: meta.notificationHistory || [],
  };
}
