const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const APK_PATH = path.resolve(__dirname, 'PronounceIt.apk');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/download' || req.url.endsWith('.apk')) {
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
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Descargar PronounceIt APK</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;background:#0d1117;color:#fff;">
        <h2>PronounceIt Android APK</h2>
        <p>Toca el botón para descargar el archivo e instalarlo en tu teléfono:</p>
        <a href="/PronounceIt.apk" style="display:inline-block;padding:15px 30px;background:#38bdf8;color:#000;text-decoration:none;border-radius:10px;font-weight:bold;font-size:18px;">⬇️ Descargar APK (76 MB)</a>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`APK Server running at http://0.0.0.0:${PORT}`);
});
