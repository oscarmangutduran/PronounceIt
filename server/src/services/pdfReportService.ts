import PDFDocument from 'pdfkit';
import { getDb } from '../db.js';
import { deliverEmail } from './emailService.js';

export interface UsersPdfReportResult {
  success: boolean;
  message: string;
  filename: string;
  totalUsers: number;
  recipient: string;
}

/**
 * Genera el documento PDF oficial con los campos requeridos:
 * - Nombre
 * - Email
 * - Fecha de alta
 */
export async function generateUsersPdfBuffer(): Promise<{
  buffer: Buffer;
  filename: string;
  totalUsers: number;
}> {
  const db = await getDb();
  const users = db.users || [];

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const dateSlug = new Date().toISOString().split('T')[0];
        const filename = `PronounceIt_Usuarios_Registrados_${dateSlug}.pdf`;
        resolve({ buffer, filename, totalUsers: users.length });
      });
      doc.on('error', (err) => reject(err));

      // 1. Cabecera Corporativa PronounceIt
      doc.rect(40, 40, 515, 62).fill('#130d22');
      doc.rect(40, 100, 515, 3).fill('#e62e4c');

      // Título
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
        .text('PronounceIt', 55, 52, { continued: true })
        .fillColor('#ff4d6d').fontSize(14).font('Helvetica')
        .text('  ·  Registro de Usuarios');

      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
        .text('Plataforma de Léxico & Pronunciación en Inglés', 55, 78);

      // Metadatos a la derecha
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.fillColor('#cbd5e1').fontSize(8.5).font('Helvetica')
        .text(`Fecha de emisión: ${dateStr}`, 350, 55, { align: 'right', width: 190 })
        .text(`Total de usuarios dados de alta: ${users.length}`, 350, 72, { align: 'right', width: 190 });

      let y = 125;

      // Título de la tabla
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
        .text('LISTADO OFICIAL DE USUARIOS REGISTRADOS EN EL SISTEMA', 40, y);
      y += 18;

      // 2. Encabezado de la Tabla
      const colX = {
        num: 40,
        nombre: 75,
        email: 260,
        fecha: 435,
      };
      const colW = {
        num: 35,
        nombre: 185,
        email: 175,
        fecha: 120,
      };

      const headerHeight = 24;
      doc.rect(40, y, 515, headerHeight).fill('#1e1633');

      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Nº', colX.num + 6, y + 7, { width: colW.num });
      doc.text('Nombre', colX.nombre + 6, y + 7, { width: colW.nombre });
      doc.text('Email', colX.email + 6, y + 7, { width: colW.email });
      doc.text('Fecha de alta', colX.fecha + 6, y + 7, { width: colW.fecha });

      y += headerHeight;

      // 3. Filas de Usuarios
      const rowHeight = 24;

      users.forEach((user, index) => {
        // Salto de página si se supera el margen inferior
        if (y + rowHeight > 780) {
          doc.addPage();
          y = 40;

          // Repetir cabecera en cada nueva página
          doc.rect(40, y, 515, headerHeight).fill('#1e1633');
          doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
          doc.text('Nº', colX.num + 6, y + 7, { width: colW.num });
          doc.text('Nombre', colX.nombre + 6, y + 7, { width: colW.nombre });
          doc.text('Email', colX.email + 6, y + 7, { width: colW.email });
          doc.text('Fecha de alta', colX.fecha + 6, y + 7, { width: colW.fecha });
          y += headerHeight;
        }

        // Color alternado de fila
        const isEven = index % 2 === 0;
        doc.rect(40, y, 515, rowHeight).fill(isEven ? '#ffffff' : '#f8fafc');

        // Borde inferior sutil
        doc.rect(40, y + rowHeight - 0.5, 515, 0.5).fill('#e2e8f0');

        const createdDate = user.created_at
          ? new Date(user.created_at).toLocaleString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-';

        // Campos: Nombre, Email, Fecha de alta
        doc.fillColor('#64748b').font('Helvetica').fontSize(9)
          .text(String(index + 1), colX.num + 6, y + 7, { width: colW.num });

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9)
          .text(user.username || 'Sin nombre', colX.nombre + 6, y + 7, {
            width: colW.nombre - 10,
            ellipsis: true,
          });

        doc.fillColor('#2563eb').font('Helvetica').fontSize(9)
          .text(user.email || 'Sin correo', colX.email + 6, y + 7, {
            width: colW.email - 10,
            ellipsis: true,
          });

        doc.fillColor('#475569').font('Helvetica').fontSize(9)
          .text(createdDate, colX.fecha + 6, y + 7, { width: colW.fecha });

        y += rowHeight;
      });

      // 4. Bloque Informativo Final
      y += 18;
      if (y + 70 > 780) {
        doc.addPage();
        y = 40;
      }

      doc.rect(40, y, 515, 60).fill('#f1f5f9');
      doc.rect(40, y, 515, 60).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold')
        .text('Resumen del Registro:', 55, y + 12);

      doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
        .text(`• Total de usuarios en base de datos: ${users.length} usuarios`, 55, y + 26)
        .text(`• Informe periódico enviado automáticamente el día 1 de cada mes a hola@oscarmangutdev.es`, 55, y + 38);

      // 5. Pie de Página y Numeración
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.rect(40, 800, 515, 0.5).fill('#cbd5e1');
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
          .text('PronounceIt · Registro Confidencial de Usuarios', 40, 810, { align: 'left', width: 350 })
          .text(`Página ${i + 1} de ${totalPages}`, 400, 810, { align: 'right', width: 155 });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Genera el archivo PDF con los campos (Nombre, Email, Fecha de alta)
 * y lo envía por correo electrónico a hola@oscarmangutdev.es
 */
export async function sendUsersPdfReportEmail(
  targetEmail = 'hola@oscarmangutdev.es'
): Promise<UsersPdfReportResult> {
  const { buffer, filename, totalUsers } = await generateUsersPdfBuffer();

  const now = new Date();
  const mesNombre = now.toLocaleString('es-ES', { month: 'long' });
  const year = now.getFullYear();
  const mesCapitalizado = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);

  const subject = `📄 PronounceIt: Informe Mensual de Usuarios Registrados - ${mesCapitalizado} ${year}`;
  const timestamp = now.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

  const htmlContent = `
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
    .security-notice { background-color: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 12px 14px; border-radius: 8px; font-size: 12.5px; color: #a7f3d0; margin-top: 18px; }
    .footer { border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 18px 24px; background-color: rgba(0, 0, 0, 0.2); text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand">PronounceIt · Informe Mensual</h1>
      </div>
      <div class="content">
        <h1>Informe Mensual de Usuarios Registrados 📄</h1>
        <p>Hola, <strong>Óscar</strong>:</p>
        <p>
          Te enviamos el <strong>archivo PDF oficial</strong> con todos los usuarios dados de alta en <strong>PronounceIt</strong> correspondiente a este periodo.
        </p>

        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Archivo PDF adjunto:</span>
            <span class="info-value"><span class="badge">${filename}</span></span>
          </div>
          <div class="info-row">
            <span class="info-label">Campos incluidos:</span>
            <span class="info-value">Nombre, Email y Fecha de alta</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total de usuarios:</span>
            <span class="info-value" style="color: #10b981;">${totalUsers} usuarios registrados</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha de emisión:</span>
            <span class="info-value">${timestamp}</span>
          </div>
        </div>

        <div class="security-notice">
          🗓️ <strong>Programación Automática:</strong> Este reporte está configurado para generarse y enviarse automáticamente el <strong>día 1 de cada mes</strong> a tu dirección <strong>${targetEmail}</strong>.
        </div>

        <p style="margin-top: 22px; font-size: 13px; color: #94a3b8;">
          El archivo PDF ha sido maquetado profesionalmente y optimizado para visualización o impresión en formato A4.
        </p>
      </div>
      <div class="footer">
        <p style="margin: 0;">PronounceIt · Servicio de Reportes Automatizados</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Informe Mensual de Usuarios Registrados - PronounceIt

Adjunto encontrarás el archivo PDF oficial (${filename}) con los usuarios dados de alta en el sistema.

Campos incluidos:
- Nombre
- Email
- Fecha de alta

Total de usuarios: ${totalUsers}
Fecha: ${timestamp}
Programación: Se envía automáticamente el día 1 de cada mes a ${targetEmail}.

Atentamente,
Servicio Backend de PronounceIt
`;

  const ok = await deliverEmail({
    to: targetEmail,
    subject,
    html: htmlContent,
    text: textContent,
    attachments: [
      {
        filename,
        content: buffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    success: ok,
    message: ok
      ? `Archivo PDF (${filename}) con ${totalUsers} usuarios enviado exitosamente a ${targetEmail}`
      : `No se pudo enviar el archivo PDF a ${targetEmail}`,
    filename,
    totalUsers,
    recipient: targetEmail,
  };
}
