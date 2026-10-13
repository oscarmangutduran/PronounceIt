const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const APK_PATH = path.resolve(__dirname, 'PronounceIt.apk');

const server = http.createServer((req, res) => {
  if (req.url === '/download' || req.url.endsWith('.apk')) {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('APK not found');
    }
    const stat = fs.statSync(APK_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="PronounceIt.apk"',
    });
    const readStream = fs.createReadStream(APK_PATH);
    readStream.pipe(res);
  } else {
    const stat = fs.existsSync(APK_PATH) ? fs.statSync(APK_PATH) : null;
    const sizeMb = stat ? (stat.size / (1024 * 1024)).toFixed(1) : '76';
    const host = req.headers.host || 'localhost:8080';
    const downloadUrl = `http://${host}/PronounceIt.apk`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(downloadUrl)}`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Descargar PronounceIt APK</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; text-align: center; }
          .card { background: #1e293b; padding: 32px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 420px; width: 100%; box-sizing: border-box; border: 1px solid #334155; }
          h1 { margin: 0 0 10px 0; font-size: 24px; color: #38bdf8; }
          p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
          .btn { display: inline-block; width: 100%; box-sizing: border-box; padding: 16px; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 17px; box-shadow: 0 4px 15px rgba(56,189,248,0.3); transition: transform 0.2s; }
          .btn:active { transform: scale(0.98); }
          .qr-box { margin-top: 24px; padding-top: 20px; border-top: 1px solid #334155; }
          .qr-img { border-radius: 12px; border: 4px solid #fff; max-width: 180px; }
          .note { font-size: 12px; color: #64748b; margin-top: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 PronounceIt APK</h1>
          <p>Versión actualizada con sincronización de cuenta y palabras en tiempo real.</p>
          <a href="/PronounceIt.apk" class="btn">⬇️ Descargar APK (${sizeMb} MB)</a>
          <div class="qr-box">
            <p style="margin-bottom: 12px; font-size: 13px;">O escanea este código desde tu teléfono móvil conectado a la misma red Wi-Fi:</p>
            <img src="${qrUrl}" alt="Código QR de descarga" class="qr-img" />
          </div>
          <div class="note">Recuerda permitir "Instalar aplicaciones de fuentes desconocidas" si tu teléfono lo solicita.</div>
        </div>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`APK Server running at http://0.0.0.0:${PORT}`);
});
