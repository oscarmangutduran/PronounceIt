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
 * Maquetación visual premium del correo de Nueva Versión para usuarios
 */
export function buildNewVersionEmailHtml(username: string, versionInfo: NewVersionInfo): string {
  const version = versionInfo.version || '1.7.0';
  const apkUrl = versionInfo.apkUrl || `https://github.com/oscarmangutduran/PronounceIt/releases/download/v${version}/PronounceIt-v${version}.apk`;
  const iosUrl = versionInfo.iosUrl || 'https://pronounceit-sand.vercel.app/apple';
  const webUrl = versionInfo.webUrl || 'https://pronounceit-sand.vercel.app/';
  const logoUrl = 'https://pronounceit-sand.vercel.app/favicon.png';
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>🚀 ¡Nueva Versión v${version} de PronounceIt!</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #080510; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
    .email-container { max-width: 620px; margin: 0 auto; background-color: #130d22; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5); }
    .hero-gradient { background: linear-gradient(135deg, #e62e4c 0%, #b81432 50%, #1f0d2c 100%); padding: 38px 28px 30px 28px; text-align: center; }
    .badge-pill { display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 30px; padding: 6px 16px; font-size: 12px; font-weight: 700; color: #ffffff; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 16px; }
    .hero-title { font-size: 26px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0; line-height: 1.25; }
    .hero-subtitle { font-size: 14px; color: rgba(255, 255, 255, 0.9); margin: 0; font-weight: 400; line-height: 1.5; }
    .body-content { padding: 32px 30px; }
    .greeting { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 14px 0; }
    .lead-text { font-size: 14.5px; line-height: 1.65; color: #cbd5e1; margin: 0 0 24px 0; }
    .feature-card { background-color: #1b1330; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; }
    .feature-title { font-size: 15px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; display: flex; align-items: center; }
    .feature-desc { font-size: 13.5px; line-height: 1.55; color: #94a3b8; margin: 0; }
    .btn-download-apk { display: block; text-align: center; background: linear-gradient(135deg, #e62e4c 0%, #c91836 100%); color: #ffffff !important; padding: 16px 28px; border-radius: 12px; font-size: 16px; font-weight: 800; text-decoration: none; box-shadow: 0 8px 22px rgba(230, 46, 76, 0.45); letter-spacing: 0.2px; margin: 24px 0 12px 0; }
    .btn-secondary { display: inline-block; text-align: center; background-color: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.16); color: #f1f5f9 !important; padding: 12px 20px; border-radius: 10px; font-size: 13.5px; font-weight: 600; text-decoration: none; margin: 4px; }
    .info-box { background-color: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; border-radius: 10px; padding: 16px 18px; margin: 26px 0; }
    .info-box-title { font-size: 13.5px; font-weight: 700; color: #93c5fd; margin: 0 0 4px 0; }
    .info-box-desc { font-size: 13px; line-height: 1.5; color: #bfdbfe; margin: 0; }
    .footer { background-color: #0e091a; border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 26px 30px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer-link { color: #ff4d6d; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #080510;">
  <center style="width: 100%; background-color: #080510; padding: 40px 12px;">
    <!-- Container Principal -->
    <div class="email-container" style="max-width: 620px; margin: 0 auto; background-color: #130d22; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.12); text-align: left;">
      
      <!-- HERO HEADER CON LOGOTIPO -->
      <div class="hero-gradient" style="background: linear-gradient(135deg, #e62e4c 0%, #b81432 50%, #1f0d2c 100%); padding: 36px 28px 30px 28px; text-align: center;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <img src="${logoUrl}" alt="PronounceIt" width="60" height="60" style="display: block; width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 16px auto; box-shadow: 0 8px 20px rgba(0,0,0,0.4);" />
              <div class="badge-pill" style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 30px; padding: 5px 16px; font-size: 12px; font-weight: 700; color: #ffffff; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 14px;">
                🚀 Nueva Versión v${version} Disponible
              </div>
              <h1 class="hero-title" style="font-size: 26px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0;">¡Actualiza PronounceIt ahora!</h1>
              <p class="hero-subtitle" style="font-size: 14px; color: rgba(255, 255, 255, 0.9); margin: 0;">Lanzamiento oficial · ${today}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- CUERPO DEL MENSAJE -->
      <div class="body-content" style="padding: 32px 30px;">
        <h2 class="greeting" style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">¡Hola, ${username}! 👋</h2>
        <p class="lead-text" style="font-size: 14.5px; line-height: 1.65; color: #cbd5e1; margin: 0 0 24px 0;">
          Hemos publicado una <strong>gran actualización de PronounceIt (v${version})</strong> con nuevas funciones para perfeccionar tu vocabulario, fluidez fonética y práctica en inglés. Te invitamos a descargarla y disfrutar de todas las mejoras.
        </p>

        <!-- NOVEDADES EN TARJETAS -->
        <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">
          ✨ Novedades de esta actualización:
        </h3>

        <!-- Novedad 1 -->
        <div class="feature-card" style="background-color: #1b1330; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin-bottom: 12px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="36" valign="top" style="font-size: 22px; line-height: 1;">🎯</td>
              <td style="padding-left: 12px;">
                <strong style="font-size: 15px; color: #ffffff; display: block; margin-bottom: 4px;">Tests por Categoría y Subcategoría</strong>
                <p style="font-size: 13.5px; line-height: 1.5; color: #94a3b8; margin: 0;">
                  Ahora puedes realizar evaluaciones temáticas específicas: viajes, negocios, phrasal verbs, verbos irregulares o tus listas personalizadas con retroalimentación instantánea.
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Novedad 2 -->
        <div class="feature-card" style="background-color: #1b1330; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin-bottom: 12px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="36" valign="top" style="font-size: 22px; line-height: 1;">🇬🇧</td>
              <td style="padding-left: 12px;">
                <strong style="font-size: 15px; color: #ffffff; display: block; margin-bottom: 4px;">Identidad Renovada con la Bandera UK</strong>
                <p style="font-size: 13.5px; line-height: 1.5; color: #94a3b8; margin: 0;">
                  Nuevo icono y logotipo integrado con la bandera del Reino Unido y ondas sonoras acústicas, reflejado en el favicon, la navegación y las pantallas de la app.
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Novedad 3 -->
        <div class="feature-card" style="background-color: #1b1330; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin-bottom: 12px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="36" valign="top" style="font-size: 22px; line-height: 1;">🗺️</td>
              <td style="padding-left: 12px;">
                <strong style="font-size: 15px; color: #ffffff; display: block; margin-bottom: 4px;">Enrutamiento con URLs en Castellano</strong>
                <p style="font-size: 13.5px; line-height: 1.5; color: #94a3b8; margin: 0;">
                  Navegación fluida con enlaces canónicos directos (<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #fca5a5;">/flashcards</code>, <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #fca5a5;">/test</code>, <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #fca5a5;">/estadisticas</code>, <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #fca5a5;">/configuracion</code>) con soporte completo para retroceder y avanzar.
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Novedad 4 -->
        <div class="feature-card" style="background-color: #1b1330; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin-bottom: 22px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="36" valign="top" style="font-size: 22px; line-height: 1;">⚡</td>
              <td style="padding-left: 12px;">
                <strong style="font-size: 15px; color: #ffffff; display: block; margin-bottom: 4px;">Sincronización Offline y Rendimiento</strong>
                <p style="font-size: 13.5px; line-height: 1.5; color: #94a3b8; margin: 0;">
                  Mayor velocidad de carga en dispositivos móviles y sincronización inmediata con la nube para que nunca pierdas tu racha de estudio.
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- BOTONES DE ACCIÓN PRINCIPALES -->
        <div style="text-align: center; margin: 26px 0 16px 0;">
          <a href="${apkUrl}" class="btn-download-apk" style="display: block; text-align: center; background: linear-gradient(135deg, #e62e4c 0%, #c91836 100%); color: #ffffff !important; padding: 16px 28px; border-radius: 12px; font-size: 16px; font-weight: 800; text-decoration: none; box-shadow: 0 8px 22px rgba(230, 46, 76, 0.45); margin: 0 0 14px 0;">
            📲 Descargar APK v${version} (Android)
          </a>

          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="50%" align="center" style="padding-right: 6px;">
                <a href="${iosUrl}" class="btn-secondary" style="display: block; text-align: center; background-color: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.16); color: #f1f5f9 !important; padding: 12px 14px; border-radius: 10px; font-size: 13.5px; font-weight: 600; text-decoration: none;">
                  🍏 Instalar en iPhone (iOS)
                </a>
              </td>
              <td width="50%" align="center" style="padding-left: 6px;">
                <a href="${webUrl}" class="btn-secondary" style="display: block; text-align: center; background-color: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.16); color: #f1f5f9 !important; padding: 12px 14px; border-radius: 10px; font-size: 13.5px; font-weight: 600; text-decoration: none;">
                  🌐 Abrir en la Web
                </a>
              </td>
            </tr>
          </table>
        </div>

        <!-- CAJA DE INFORMACIÓN / INSTRUCCIONES -->
        <div class="info-box" style="background-color: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; border-radius: 10px; padding: 16px 18px; margin: 26px 0;">
          <p class="info-box-title" style="font-size: 13.5px; font-weight: 700; color: #93c5fd; margin: 0 0 4px 0;">
            🔄 ¿Cómo actualizar tu app móvil en Android?
          </p>
          <p class="info-box-desc" style="font-size: 13px; line-height: 1.55; color: #cbd5e1; margin: 0;">
            Descarga el archivo APK pulsando el botón superior y pulsa <strong>"Actualizar"</strong> en tu móvil. Tus palabras, estadísticas y progreso se conservan intactos automáticamente.
          </p>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 24px 0 0 0; text-align: center;">
          ¿Tienes dudas o sugerencias? Responde directamente a este correo o escríbenos a <a href="mailto:hola@oscarmangutdev.es" style="color: #ff4d6d; text-decoration: none; font-weight: 600;">hola@oscarmangutdev.es</a>.
        </p>
      </div>

      <!-- FOOTER -->
      <div class="footer" style="background-color: #0e091a; border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 24px 30px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 8px 0; color: #94a3b8;">
          Estás recibiendo este correo porque tu cuenta está registrada en <strong>PronounceIt</strong>.
        </p>
        <p style="margin: 0 0 10px 0;">
          <a href="https://pronounceit-sand.vercel.app/" class="footer-link" style="color: #ff4d6d; text-decoration: none; font-weight: 600;">Web Oficial</a> · 
          <a href="https://pronounceit-sand.vercel.app/configuracion" class="footer-link" style="color: #ff4d6d; text-decoration: none; font-weight: 600;">Ajustes de Cuenta</a> · 
          <a href="mailto:hola@oscarmangutdev.es" class="footer-link" style="color: #ff4d6d; text-decoration: none; font-weight: 600;">Soporte Técnico</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #475569;">
          © ${new Date().getFullYear()} PronounceIt · Léxico & Pronunciación. Todos los derechos reservados.
        </p>
      </div>

    </div>
  </center>
</body>
</html>
  `;
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

  const htmlContent = buildNewVersionEmailHtml(username, versionInfo);

  const textContent = `
¡Hola, ${username}!

Tenemos grandes noticias: hemos publicado una nueva versión oficial de PronounceIt (v${version}).

🌟 Novedades principales:
- Tests por categoría y subcategoría temática de vocabulario.
- Nueva identidad visual con logotipo de la bandera de Reino Unido.
- Enrutamiento directo y URLs limpias en castellano (/flashcards, /test, /estadisticas, /configuracion).
- Sincronización offline y mejoras de rendimiento.

Enlaces de descarga:
- Descargar APK (Android): ${apkUrl}
- Instalar en Apple (iOS): ${iosUrl}
- Acceder vía Web: ${webUrl}

Nota: Tus palabras y estadísticas se conservan intactas al actualizar.

Saludos cordiales,
Equipo PronounceIt (${SENDER_EMAIL})
`;

  return deliverEmail({ to, subject, html: htmlContent, text: textContent });
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
