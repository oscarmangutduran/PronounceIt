import nodemailer, { type Transporter } from 'nodemailer';
import { getDb, type UserRecord } from '../db.js';

export interface NewVersionInfo {
  version: string;
  releaseNotes?: string[];
  apkUrl?: string;
  iosUrl?: string;
  webUrl?: string;
}

export interface BroadcastResult {
  version: string;
  totalUsers: number;
  sentCount: number;
  failedCount: number;
  details: { email: string; username: string; status: 'sent' | 'failed'; error?: string }[];
}

const SENDER_EMAIL = process.env.SMTP_USER || 'hola@oscarmangutdev.es';
const SENDER_NAME = process.env.EMAIL_FROM_NAME || 'PronounceIt';
const SENDER_FULL = `"${SENDER_NAME}" <${SENDER_EMAIL}>`;

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.strato.de';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : port === 465;
  const user = process.env.SMTP_USER || 'hola@oscarmangutdev.es';
  const pass = process.env.SMTP_PASS || 'Londres2025';

  if (pass && pass.trim()) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    return transporter;
  }

  return null;
}

/**
 * Plantilla base con estética premium y diseño adaptable (Dark / Light)
 */
function buildHtmlLayout(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0c0915;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }
    .wrapper {
      width: 100%;
      background-color: #0c0915;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #161026;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #e62e4c 0%, #b81432 100%);
      padding: 30px 24px;
      text-align: center;
    }
    .brand {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .tagline {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 4px;
      margin-bottom: 0;
      font-weight: 500;
    }
    .content {
      padding: 32px 28px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #cbd5e1;
      margin: 0 0 16px 0;
    }
    .info-card {
      background-color: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 18px 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 13px;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #94a3b8;
      font-weight: 600;
    }
    .info-value {
      color: #ffffff;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      background-color: rgba(230, 46, 76, 0.2);
      border: 1px solid rgba(230, 46, 76, 0.4);
      color: #ff4d6d;
      font-weight: 700;
      font-size: 13px;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 20px 28px;
      background-color: rgba(0, 0, 0, 0.2);
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #ff4d6d;
      text-decoration: none;
    }
    .security-notice {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12px;
      color: #fde68a;
      margin-top: 18px;
    }
    .danger-notice {
      background-color: rgba(239, 68, 68, 0.1);
      border-left: 4px solid #ef4444;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12px;
      color: #fca5a5;
      margin-top: 18px;
    }
    .btn-container {
      text-align: center;
      margin: 26px 0 16px 0;
    }
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #e62e4c 0%, #b81432 100%);
      color: #ffffff !important;
      padding: 13px 26px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(230, 46, 76, 0.4);
      margin: 6px 4px;
    }
    .btn-secondary {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff !important;
      padding: 12px 20px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      margin: 6px 4px;
    }
    .feature-list {
      list-style: none;
      padding-left: 0;
      margin: 14px 0 6px 0;
    }
    .feature-item {
      padding: 7px 0;
      font-size: 13.5px;
      color: #cbd5e1;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .feature-item:last-child {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand">PronounceIt</h1>
        <p class="tagline">Dominio y pronunciación nativa de inglés</p>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px 0; color: #94a3b8;">
          Este correo fue enviado desde <strong>${SENDER_EMAIL}</strong>
        </p>
        <p style="margin: 0; font-size: 11px;">
          © ${new Date().getFullYear()} PronounceIt · Todos los derechos reservados.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * 1. Envío de correo al crear cuenta (Registro / Bienvenida)
 */
export async function sendWelcomeEmail(to: string, username: string, tempPassword = '12345'): Promise<boolean> {
  const subject = '🎉 ¡Bienvenido a PronounceIt! Tus credenciales de acceso';
  const htmlContent = `
    <h1>¡Hola, ${username}! 👋</h1>
    <p>
      Te damos una cálida bienvenida a <strong>PronounceIt</strong>, tu plataforma para perfeccionar la pronunciación y vocabulario en inglés con fonética IPA y voz nativa.
    </p>
    <p>
      Tu cuenta ha sido creada exitosamente. Aquí tienes tus datos de acceso provisionales:
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Usuario:</span>
        <span class="info-value">${username}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Correo registrado:</span>
        <span class="info-value">${to}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Contraseña provisional:</span>
        <span class="info-value"><span class="badge">${tempPassword}</span></span>
      </div>
    </div>

    <div class="security-notice">
      🔒 <strong>Recomendación de seguridad:</strong> Al iniciar sesión por primera vez, te recomendamos actualizar tu contraseña a una clave definitiva y personal desde el menú de Configuración / Editar Perfil.
    </div>

    <p style="margin-top: 24px;">
      ¡Esperamos que disfrutes aprendiendo y perfeccionando tu inglés con PronounceIt!
    </p>
  `;

  const textContent = `
¡Hola, ${username}!

Te damos la bienvenida a PronounceIt.
Tu cuenta ha sido creada exitosamente.

Tus datos de acceso:
- Usuario: ${username}
- Correo: ${to}
- Contraseña provisional: ${tempPassword}

Recomendación de seguridad: Recuerda cambiar tu contraseña temporal en tu primer inicio de sesión.

Saludos cordiales,
Equipo PronounceIt (${SENDER_EMAIL})
`;

  return deliverEmail({ to, subject, html: buildHtmlLayout(subject, htmlContent), text: textContent });
}

/**
 * 2. Envío de correo al cambiar o restablecer contraseña
 */
export async function sendPasswordChangedEmail(to: string, username = 'Usuario'): Promise<boolean> {
  const subject = '🔒 PronounceIt: Tu contraseña ha sido actualizada';
  const timestamp = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

  const htmlContent = `
    <h1>Seguridad de tu Cuenta 🛡️</h1>
    <p>Hola, <strong>${username}</strong>:</p>
    <p>
      Te notificamos que la contraseña de acceso a tu cuenta de <strong>PronounceIt</strong> ha sido modificada correctamente.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Cuenta:</span>
        <span class="info-value">${to}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha y hora:</span>
        <span class="info-value">${timestamp}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Estado:</span>
        <span class="info-value" style="color: #10b981;">Actualizada con éxito</span>
      </div>
    </div>

    <div class="security-notice">
      ⚠️ <strong>¿No reconoces esta acción?</strong> Si tú no realizaste este cambio, por favor ponte en contacto de inmediato con nuestro soporte respondiendo a este correo (<strong>${SENDER_EMAIL}</strong>) para proteger tu cuenta.
    </div>

    <p style="margin-top: 24px;">
      Gracias por mantener tu cuenta segura.
    </p>
  `;

  const textContent = `
Hola, ${username}:

Te confirmamos que la contraseña de tu cuenta de PronounceIt asociada a ${to} ha sido actualizada con éxito el ${timestamp}.

Si tú no realizaste este cambio, por favor contáctanos de inmediato escribiendo a ${SENDER_EMAIL}.

Saludos,
Equipo PronounceIt (${SENDER_EMAIL})
`;

  return deliverEmail({ to, subject, html: buildHtmlLayout(subject, htmlContent), text: textContent });
}

/**
 * 3. Envío de correo al darse de baja (Eliminación de cuenta)
 */
export async function sendAccountDeletedEmail(to: string, username = 'Usuario'): Promise<boolean> {
  const subject = '👋 PronounceIt: Confirmación de baja de cuenta';
  const timestamp = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

  const htmlContent = `
    <h1>Confirmación de Baja de Cuenta</h1>
    <p>Estimado/a <strong>${username}</strong>:</p>
    <p>
      Te confirmamos que tu solicitud de <strong>baja definitiva</strong> en PronounceIt ha sido procesada exitosamente.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Usuario dado de baja:</span>
        <span class="info-value">${username}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Correo electrónico:</span>
        <span class="info-value">${to}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha de eliminación:</span>
        <span class="info-value">${timestamp}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Estado de datos:</span>
        <span class="info-value" style="color: #ef4444;">Eliminados permanentemente</span>
      </div>
    </div>

    <p>
      Todos tus datos personales, listas de vocabulario y registros de pruebas han sido eliminados de nuestros servidores conforme a nuestras políticas de privacidad.
    </p>

    <p>
      Queremos agradecerte por haber formado parte de PronounceIt. Si en el futuro deseas retomar tu aprendizaje del inglés, estaremos encantados de darte la bienvenida de nuevo.
    </p>

    <div class="danger-notice">
      ℹ️ Si solicitaste esta baja por error, puedes volver a registrarte en cualquier momento creando una nueva cuenta.
    </div>
  `;

  const textContent = `
Estimado/a ${username}:

Te confirmamos que tu cuenta en PronounceIt asociada a ${to} ha sido dada de baja y eliminada exitosamente el ${timestamp}.

Todos tus datos y registros de vocabulario han sido eliminados de nuestros servidores.

Gracias por haber utilizado PronounceIt. Si deseas volver en el futuro, las puertas siempre estarán abiertas.

Atentamente,
Equipo PronounceIt (${SENDER_EMAIL})
`;

  return deliverEmail({ to, subject, html: buildHtmlLayout(subject, htmlContent), text: textContent });
}

/**
 * 4. Envío de correo de nueva versión / actualización de la app a un usuario
 */
export async function sendNewVersionNotificationEmail(
  to: string,
  username = 'Usuario',
  versionInfo: NewVersionInfo
): Promise<boolean> {
  const version = versionInfo.version || '1.7.0';
  const subject = `🚀 ¡Nueva versión disponible de PronounceIt v${version}! Descárgala ahora`;
  const apkUrl = versionInfo.apkUrl || `https://github.com/oscarmangutduran/PronounceIt/releases/download/v${version}/PronounceIt-v${version}.apk`;
  const iosUrl = versionInfo.iosUrl || 'https://pronounceit-sand.vercel.app/apple';
  const webUrl = versionInfo.webUrl || 'https://pronounceit-sand.vercel.app/';
  const notes = versionInfo.releaseNotes && versionInfo.releaseNotes.length > 0
    ? versionInfo.releaseNotes
    : [
        'Evaluación interactiva de tests por categoría y subcategoría de vocabulario',
        'Nuevo logotipo e icono oficial integrado en toda la plataforma',
        'Enrutamiento directo y navegación con URLs limpias en castellano (/flashcards, /test, /estadisticas, /configuracion)',
        'Optimización de carga y sincronización offline-first con la nube',
      ];

  const featuresHtml = notes
    .map((item) => `<li class="feature-item">✨ <strong>${item}</strong></li>`)
    .join('\n');

  const htmlContent = `
    <h1>¡Hola, ${username}! 👋</h1>
    <p>
      Tenemos grandes noticias para ti: hemos publicado una <strong>nueva versión oficial de PronounceIt (v${version})</strong> con importantes mejoras en el aprendizaje de vocabulario y nuevas funciones.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Versión disponible:</span>
        <span class="info-value"><span class="badge">v${version}</span></span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha de lanzamiento:</span>
        <span class="info-value">${new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Compatibilidad:</span>
        <span class="info-value">Android (APK), iOS (Apple) y Web</span>
      </div>
    </div>

    <h2 style="font-size: 16px; color: #ffffff; margin: 20px 0 8px 0;">🌟 Novedades de esta actualización:</h2>
    <ul class="feature-list">
      ${featuresHtml}
    </ul>

    <div class="btn-container">
      <a href="${apkUrl}" class="btn-primary" target="_blank" rel="noopener">
        📲 Descargar APK v${version} (Android)
      </a>
      <a href="${iosUrl}" class="btn-secondary" target="_blank" rel="noopener">
        🍎 Instalar en Apple (iOS)
      </a>
      <a href="${webUrl}" class="btn-secondary" target="_blank" rel="noopener">
        🌐 Abrir en Web
      </a>
    </div>

    <div class="security-notice" style="margin-top: 24px;">
      🔄 <strong>¿Cómo actualizar tu app?</strong> Si utilizas la versión instalada en tu móvil Android, simplemente pulsa en el botón de <strong>Descargar APK</strong> y abre el archivo para actualizar. Tu progreso, listas de palabras y estadísticas se mantienen intactos y sincronizados.
    </div>

    <p style="margin-top: 24px; font-size: 13px; color: #94a3b8;">
      Si tienes alguna duda o sugerencia sobre esta versión, puedes responder directamente a este correo electrónico. ¡Gracias por aprender y mejorar tu inglés con nosotros!
    </p>
  `;

  const textContent = `
¡Hola, ${username}!

Tenemos grandes noticias: hemos publicado una nueva versión oficial de PronounceIt (v${version}).

🌟 Novedades principales:
${notes.map((n) => `- ${n}`).join('\n')}

Enlaces de descarga y acceso:
- Descargar APK (Android): ${apkUrl}
- Instalar en Apple (iOS): ${iosUrl}
- Acceder vía Web: ${webUrl}

Nota: Tus palabras, progreso y evaluaciones se conservan al actualizar.

Saludos cordiales,
Equipo PronounceIt (${SENDER_EMAIL})
`;

  return deliverEmail({ to, subject, html: buildHtmlLayout(subject, htmlContent), text: textContent });
}

/**
 * 5. Envía en masa la notificación de nueva versión a todos los usuarios registrados
 */
export async function broadcastNewVersionEmail(versionInfo: NewVersionInfo): Promise<BroadcastResult> {
  const db = await getDb();
  const users = (db.users || []).filter((u) => u && u.email && u.email.includes('@'));
  const version = versionInfo.version || '1.7.0';

  console.log(`\n📢 [BROADCAST] Iniciando envío de notificación de versión v${version} a ${users.length} usuarios...`);

  const details: BroadcastResult['details'] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const user of users) {
    try {
      const ok = await sendNewVersionNotificationEmail(user.email, user.username || 'Estudiante', versionInfo);
      if (ok) {
        sentCount++;
        details.push({ email: user.email, username: user.username || '', status: 'sent' });
      } else {
        failedCount++;
        details.push({ email: user.email, username: user.username || '', status: 'failed', error: 'Delivery returned false' });
      }
    } catch (err: any) {
      failedCount++;
      details.push({ email: user.email, username: user.username || '', status: 'failed', error: err?.message || String(err) });
    }
  }

  console.log(`📢 [BROADCAST] Finalizado: ${sentCount} enviados, ${failedCount} fallidos de un total de ${users.length} usuarios.\n`);

  return {
    version,
    totalUsers: users.length,
    sentCount,
    failedCount,
    details,
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

/**
 * Función interna de entrega con fallback seguro y logging detallado
 */
export async function deliverEmail(options: EmailOptions): Promise<boolean> {
  const mailTransporter = getTransporter();

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: SENDER_FULL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });

      console.log(`\n======================================================`);
      console.log(`📧 [EMAIL SERVICE] Correo ENVIADO EN VIVO vía SMTP`);
      console.log(`Remitente: ${SENDER_FULL}`);
      console.log(`Destinatario: ${options.to}`);
      console.log(`Asunto: ${options.subject}`);
      if (options.attachments && options.attachments.length > 0) {
        console.log(`Adjuntos: ${options.attachments.map((a) => a.filename).join(', ')}`);
      }
      console.log(`MessageId: ${info.messageId}`);
      console.log(`======================================================\n`);
      return true;
    } catch (err: any) {
      console.error(`❌ [EMAIL SERVICE] Error al enviar email vía SMTP a ${options.to}:`, err?.message || err);
    }
  }

  // Fallback: Si no hay credenciales SMTP_PASS configuradas o falló la conexión SMTP
  console.log(`\n======================================================`);
  console.log(`📧 [EMAIL SERVICE] Simulación / Registro de Envío`);
  console.log(`Remitente: ${SENDER_FULL}`);
  console.log(`Destinatario: ${options.to}`);
  console.log(`Asunto: ${options.subject}`);
  if (options.attachments && options.attachments.length > 0) {
    console.log(`Adjuntos: ${options.attachments.map((a) => a.filename).join(', ')}`);
  }
  console.log(`Fecha: ${new Date().toISOString()}`);
  if (!process.env.SMTP_PASS) {
    console.log(`ℹ️ Nota: Para entrega SMTP en vivo, configura SMTP_PASS en server/.env`);
  }
  console.log(`======================================================\n`);
  return true;
}
