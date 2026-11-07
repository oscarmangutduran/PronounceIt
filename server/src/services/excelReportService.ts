import * as XLSX from 'xlsx';
import { getDb } from '../db.js';
import { deliverEmail } from './emailService.js';

export interface UsersExcelReportResult {
  success: boolean;
  message: string;
  filename: string;
  totalUsers: number;
  recipient: string;
}

/**
 * Genera el archivo Excel (.xlsx) con todos los usuarios registrados y métricas asociadas
 */
export async function generateUsersExcelBuffer(): Promise<{
  buffer: Buffer;
  filename: string;
  totalUsers: number;
  summary: { totalUsers: number; totalWords: number; totalTests: number };
}> {
  const db = await getDb();
  const users = db.users || [];
  const words = db.words || [];
  const tests = db.tests || [];

  // Mapear cada usuario con sus métricas
  const rows = users.map((u, index) => {
    const userWords = words.filter((w) => w.userId === u.id);
    const userTests = tests.filter((t) => t.userId === u.id);

    let avgScore = '-';
    if (userTests.length > 0) {
      const sum = userTests.reduce((acc, curr) => acc + (curr.scoreOutOfTen || 0), 0);
      avgScore = (sum / userTests.length).toFixed(1) + ' / 10';
    }

    const createdFormatted = u.created_at
      ? new Date(u.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
      : '-';
    const updatedFormatted = u.updated_at
      ? new Date(u.updated_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
      : '-';

    return {
      'Nº': index + 1,
      'ID Usuario': u.id,
      'Nombre de Usuario': u.username || 'Sin nombre',
      'Correo Electrónico': u.email || 'Sin correo',
      'Fecha de Registro': createdFormatted,
      'Última Modificación': updatedFormatted,
      'Palabras en Biblioteca': userWords.length,
      'Tests Realizados': userTests.length,
      'Nota Media (Tests)': avgScore,
      'Requiere Cambio de Clave': u.must_change_password ? 'Sí' : 'No',
    };
  });

  // Hoja 1: Listado completo de usuarios
  const usersSheet = XLSX.utils.json_to_sheet(rows);

  // Auto-ajuste de ancho de columnas
  usersSheet['!cols'] = [
    { wch: 6 },  // Nº
    { wch: 18 }, // ID
    { wch: 24 }, // Usuario
    { wch: 34 }, // Email
    { wch: 20 }, // Registro
    { wch: 20 }, // Modificación
    { wch: 22 }, // Palabras
    { wch: 18 }, // Tests
    { wch: 20 }, // Nota media
    { wch: 24 }, // Cambio clave
  ];

  // Hoja 2: Resumen del sistema
  const now = new Date();
  const summaryRows = [
    { Métrica: 'Total de Usuarios Registrados', Valor: users.length },
    { Métrica: 'Total de Palabras Almacenadas', Valor: words.length },
    { Métrica: 'Total de Tests Realizados', Valor: tests.length },
    { Métrica: 'Fecha de Generación del Informe', Valor: now.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'medium' }) },
    { Métrica: 'Plataforma', Valor: 'PronounceIt (Léxico & Pronunciación)' },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 36 }, { wch: 40 }];

  // Crear libro de trabajo (Workbook)
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Usuarios Registrados');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen del Sistema');

  // Generar Buffer binario .xlsx
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const dateSlug = now.toISOString().split('T')[0];
  const filename = `PronounceIt_Usuarios_Registrados_${dateSlug}.xlsx`;

  return {
    buffer,
    filename,
    totalUsers: users.length,
    summary: {
      totalUsers: users.length,
      totalWords: words.length,
      totalTests: tests.length,
    },
  };
}

/**
 * Genera el Excel de usuarios registrados y lo envía como adjunto al correo especificado
 * (por defecto hola@oscarmangutdev.es)
 */
export async function sendUsersExcelReportEmail(
  targetEmail = 'hola@oscarmangutdev.es'
): Promise<UsersExcelReportResult> {
  const { buffer, filename, totalUsers, summary } = await generateUsersExcelBuffer();

  const timestamp = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
  const subject = `📊 PronounceIt: Informe Excel de Usuarios Registrados (${new Date().toLocaleDateString('es-ES')})`;

  const htmlContent = `
    <h1>Informe de Usuarios Registrados 📊</h1>
    <p>Hola, <strong>Administrador</strong>:</p>
    <p>
      Adjunto a este correo encontrarás el <strong>archivo Excel (.xlsx)</strong> con la base de datos completa de usuarios dados de alta en <strong>PronounceIt</strong>, actualizado a fecha de hoy.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Archivo adjunto:</span>
        <span class="info-value"><span class="badge">${filename}</span></span>
      </div>
      <div class="info-row">
        <span class="info-label">Total de usuarios dados de alta:</span>
        <span class="info-value" style="color: #10b981;">${totalUsers} usuarios</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total de palabras en la nube:</span>
        <span class="info-value">${summary.totalWords}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total de tests completados:</span>
        <span class="info-value">${summary.totalTests}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha y hora de generación:</span>
        <span class="info-value">${timestamp}</span>
      </div>
    </div>

    <h2 style="font-size: 15px; color: #ffffff; margin: 20px 0 8px 0;">Contenido del archivo Excel adjunto:</h2>
    <ul class="feature-list">
      <li class="feature-item">📑 <strong>Hoja 1 - Usuarios Registrados:</strong> ID, nombre de usuario, correo electrónico, fecha de alta, última modificación, número de palabras en su vocabulario, tests realizados y promedio de notas.</li>
      <li class="feature-item">📈 <strong>Hoja 2 - Resumen del Sistema:</strong> Estadísticas globales y métricas de plataforma.</li>
    </ul>

    <div class="security-notice" style="margin-top: 20px;">
      🔒 <strong>Aviso de Privacidad:</strong> Este informe contiene datos de carácter personal de los usuarios. Debe ser tratado con estricta confidencialidad según la normativa RGPD/LOPD.
    </div>

    <p style="margin-top: 22px; font-size: 13px; color: #94a3b8;">
      Informe generado automáticamente por el servicio de backend de PronounceIt.
    </p>
  `;

  const textContent = `
Informe de Usuarios Registrados - PronounceIt

Adjunto encontrarás el archivo ${filename} con todos los usuarios dados de alta en el sistema.

Resumen:
- Total de usuarios: ${totalUsers}
- Total de palabras: ${summary.totalWords}
- Total de tests: ${summary.totalTests}
- Fecha: ${timestamp}

Atentamente,
Servicio Backend de PronounceIt
`;

  // Plantilla base HTML
  const fullHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0c0915; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; }
    .wrapper { width: 100%; background-color: #0c0915; padding: 36px 16px; }
    .container { max-width: 580px; margin: 0 auto; background-color: #161026; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; overflow: hidden; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4); }
    .header { background: linear-gradient(135deg, #e62e4c 0%, #b81432 100%); padding: 26px 24px; text-align: center; }
    .brand { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; }
    .content { padding: 30px 26px; }
    h1 { font-size: 20px; color: #ffffff; margin-top: 0; margin-bottom: 14px; }
    p { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 14px 0; }
    .info-card { background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px 18px; margin: 18px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #94a3b8; font-weight: 600; }
    .info-value { color: #ffffff; font-weight: 700; }
    .badge { background-color: rgba(230, 46, 76, 0.2); border: 1px solid rgba(230, 46, 76, 0.4); color: #ff4d6d; font-weight: 700; font-size: 12px; padding: 3px 8px; border-radius: 6px; }
    .feature-list { list-style: none; padding-left: 0; margin: 12px 0; }
    .feature-item { padding: 6px 0; font-size: 13px; color: #cbd5e1; }
    .security-notice { background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #fde68a; }
    .footer { border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 18px 24px; background-color: rgba(0, 0, 0, 0.2); text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand">PronounceIt · Panel de Administración</h1>
      </div>
      <div class="content">
        ${htmlContent}
      </div>
      <div class="footer">
        <p style="margin: 0;">PronounceIt · Informe Oficial de Usuarios Registrados</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const ok = await deliverEmail({
    to: targetEmail,
    subject,
    html: fullHtml,
    text: textContent,
    attachments: [
      {
        filename,
        content: buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  });

  return {
    success: ok,
    message: ok
      ? `Archivo Excel (${filename}) con ${totalUsers} usuarios enviado exitosamente a ${targetEmail}`
      : `No se pudo enviar el archivo Excel a ${targetEmail}`,
    filename,
    totalUsers,
    recipient: targetEmail,
  };
}

