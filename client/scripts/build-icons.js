const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 5892;
const CLIENT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(CLIENT_DIR, 'assets');
const PUBLIC_DIR = path.join(CLIENT_DIR, 'public');
const RES_DIR = path.join(CLIENT_DIR, 'android', 'app', 'src', 'main', 'res');

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Icon Generator</title>
</head>
<body style="background:#000;">
  <h1>Generating Icons...</h1>
  <div id="status">Starting...</div>

  <script>
    async function run() {
      const status = document.getElementById('status');
      
      const svgDefs = \`
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1d1330"/>
            <stop offset="50%" stop-color="#120c1e"/>
            <stop offset="100%" stop-color="#0a0612"/>
          </linearGradient>
          <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff4d6d" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#a855f7" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#e62e4c" stop-opacity="0.25"/>
          </linearGradient>
          <radialGradient id="ambientGlow" cx="45%" cy="38%" r="52%">
            <stop offset="0%" stop-color="#e62e4c" stop-opacity="0.45"/>
            <stop offset="65%" stop-color="#9333ea" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="35%" stop-color="#ff5470"/>
            <stop offset="100%" stop-color="#e62e4c"/>
          </linearGradient>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff758c"/>
            <stop offset="100%" stop-color="#c084fc"/>
          </linearGradient>
        </defs>
      \`;

      // 1. Full Favicon SVG (original squircle with border and glow)
      const faviconSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
          \${svgDefs}
          <rect width="64" height="64" rx="16" fill="url(#bgGrad)"/>
          <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="none" stroke="url(#borderGrad)" stroke-width="1.5"/>
          <circle cx="28" cy="26" r="22" fill="url(#ambientGlow)"/>
          <rect x="14" y="14" width="7" height="36" rx="3.5" fill="url(#primaryGrad)"/>
          <path d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z M 21 20 H 27.5 C 31.5 20 33 21.8 33 24.5 C 33 27.2 31.5 29 27.5 29 H 21 Z" fill-rule="evenodd" fill="url(#primaryGrad)"/>
          <path d="M 43 18.5 C 46.5 22 46.5 27 43 30.5" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round"/>
          <path d="M 49.5 14 C 55 19.5 55 29.5 49.5 35" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round" opacity="0.95"/>
        </svg>
      \`;

      // 2. Full Square App Icon (1024x1024 for Google Play / standard icon.png)
      // Solid dark velvet gradient background filling entire square
      const fullSquareIconSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">
          \${svgDefs}
          <rect width="64" height="64" fill="url(#bgGrad)"/>
          <circle cx="28" cy="26" r="22" fill="url(#ambientGlow)"/>
          <rect x="14" y="14" width="7" height="36" rx="3.5" fill="url(#primaryGrad)"/>
          <path d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z M 21 20 H 27.5 C 31.5 20 33 21.8 33 24.5 C 33 27.2 31.5 29 27.5 29 H 21 Z" fill-rule="evenodd" fill="url(#primaryGrad)"/>
          <path d="M 43 18.5 C 46.5 22 46.5 27 43 30.5" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round"/>
          <path d="M 49.5 14 C 55 19.5 55 29.5 49.5 35" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round" opacity="0.95"/>
        </svg>
      \`;

      // 3. Round Icon (for legacy circular launcher icon)
      const roundIconSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
          \${svgDefs}
          <clipPath id="circleClip">
            <circle cx="32" cy="32" r="31"/>
          </clipPath>
          <g clip-path="url(#circleClip)">
            <rect width="64" height="64" fill="url(#bgGrad)"/>
            <circle cx="28" cy="26" r="22" fill="url(#ambientGlow)"/>
            <rect x="14" y="14" width="7" height="36" rx="3.5" fill="url(#primaryGrad)"/>
            <path d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z M 21 20 H 27.5 C 31.5 20 33 21.8 33 24.5 C 33 27.2 31.5 29 27.5 29 H 21 Z" fill-rule="evenodd" fill="url(#primaryGrad)"/>
            <path d="M 43 18.5 C 46.5 22 46.5 27 43 30.5" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round"/>
            <path d="M 49.5 14 C 55 19.5 55 29.5 49.5 35" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round" opacity="0.95"/>
          </g>
          <circle cx="32" cy="32" r="30.5" fill="none" stroke="url(#borderGrad)" stroke-width="1"/>
        </svg>
      \`;

      // 4. Adaptive Foreground (108x108 viewport, safe circle is 72x72 in center)
      // Exactly matches the favicon squircle with its neon border and glow
      const adaptiveForegroundSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="1024" height="1024">
          \${svgDefs}
          <g transform="translate(20, 20) scale(1.0625)">
            <rect width="64" height="64" rx="16" fill="url(#bgGrad)"/>
            <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="none" stroke="url(#borderGrad)" stroke-width="1.5"/>
            <circle cx="28" cy="26" r="22" fill="url(#ambientGlow)"/>
            <rect x="14" y="14" width="7" height="36" rx="3.5" fill="url(#primaryGrad)"/>
            <path d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z M 21 20 H 27.5 C 31.5 20 33 21.8 33 24.5 C 33 27.2 31.5 29 27.5 29 H 21 Z" fill-rule="evenodd" fill="url(#primaryGrad)"/>
            <path d="M 43 18.5 C 46.5 22 46.5 27 43 30.5" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round"/>
            <path d="M 49.5 14 C 55 19.5 55 29.5 49.5 35" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round" opacity="0.95"/>
          </g>
        </svg>
      \`;

      // 5. Adaptive Background (108x108 viewport filled with gradient)
      const adaptiveBackgroundSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="1024" height="1024">
          \${svgDefs}
          <rect width="108" height="108" fill="url(#bgGrad)"/>
        </svg>
      \`;

      // 6. Adaptive Monochrome (Android 13+ themed icon - pure white with transparency)
      const adaptiveMonochromeSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="1024" height="1024">
          <g transform="translate(54, 54) scale(1.18) translate(-35.25, -32)">
            <rect x="14" y="14" width="7" height="36" rx="3.5" fill="#ffffff"/>
            <path d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z M 21 20 H 27.5 C 31.5 20 33 21.8 33 24.5 C 33 27.2 31.5 29 27.5 29 H 21 Z" fill-rule="evenodd" fill="#ffffff"/>
            <path d="M 43 18.5 C 46.5 22 46.5 27 43 30.5" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
            <path d="M 49.5 14 C 55 19.5 55 29.5 49.5 35" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
          </g>
        </svg>
      \`;

      // Helper function to render SVG to canvas and get dataURL
      function renderSvg(svgStr, width, height, mime = 'image/png') {
        return new Promise((resolve, reject) => {
          const img = new Image();
          const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL(mime, 0.95));
          };
          img.onerror = (e) => reject(e);
          img.src = url;
        });
      }

      status.innerText = 'Rendering assets...';

      const results = {};

      // 1. Assets icons (Expo app config & web) - EXACT same as favicon!
      results['assets/icon.png'] = await renderSvg(faviconSvg, 1024, 1024, 'image/png');
      results['assets/android-icon-foreground.png'] = await renderSvg(adaptiveForegroundSvg, 1024, 1024, 'image/png');
      results['assets/android-icon-background.png'] = await renderSvg(adaptiveBackgroundSvg, 1024, 1024, 'image/png');
      results['assets/android-icon-monochrome.png'] = await renderSvg(adaptiveMonochromeSvg, 1024, 1024, 'image/png');
      results['assets/favicon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');
      results['public/favicon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');
      results['public/apple-touch-icon.png'] = await renderSvg(faviconSvg, 180, 180, 'image/png');
      results['assets/splash-icon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');

      // 2. Android mipmap density variants - EXACT same as favicon!
      const densities = [
        { name: 'mdpi', iconSize: 48, adaptiveSize: 108 },
        { name: 'hdpi', iconSize: 72, adaptiveSize: 162 },
        { name: 'xhdpi', iconSize: 96, adaptiveSize: 216 },
        { name: 'xxhdpi', iconSize: 144, adaptiveSize: 324 },
        { name: 'xxxhdpi', iconSize: 192, adaptiveSize: 432 }
      ];

      for (const d of densities) {
        const prefix = \`android/app/src/main/res/mipmap-\${d.name}/\`;
        results[\`\${prefix}ic_launcher.webp\`] = await renderSvg(faviconSvg, d.iconSize, d.iconSize, 'image/webp');
        results[\`\${prefix}ic_launcher_round.webp\`] = await renderSvg(faviconSvg, d.iconSize, d.iconSize, 'image/webp');
        results[\`\${prefix}ic_launcher_foreground.webp\`] = await renderSvg(adaptiveForegroundSvg, d.adaptiveSize, d.adaptiveSize, 'image/webp');
        results[\`\${prefix}ic_launcher_background.webp\`] = await renderSvg(adaptiveBackgroundSvg, d.adaptiveSize, d.adaptiveSize, 'image/webp');
        results[\`\${prefix}ic_launcher_monochrome.webp\`] = await renderSvg(adaptiveMonochromeSvg, d.adaptiveSize, d.adaptiveSize, 'image/webp');
      }

      status.innerText = 'Sending to server...';

      const resp = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });

      const resText = await resp.text();
      status.innerText = 'DONE: ' + resText;
      console.log('Finished successfully:', resText);
    }

    run().catch(err => {
      document.getElementById('status').innerText = 'ERROR: ' + err.message;
      console.error(err);
    });
  </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML_CONTENT);
  } else if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        let count = 0;
        for (const [relPath, dataUrl] of Object.entries(data)) {
          const match = dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
          if (!match) continue;
          const buffer = Buffer.from(match[1], 'base64');
          const fullPath = path.join(CLIENT_DIR, relPath);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, buffer);
          count++;
          console.log(`Saved: ${relPath} (${buffer.length} bytes)`);
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`Saved ${count} images.`);
        console.log(`Successfully generated and saved ${count} images!`);
        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      } catch (e) {
        console.error('Error saving images:', e);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error: ' + e.message);
      }
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Icon server running at http://127.0.0.1:${PORT}`);
  
  // Launch Edge headless
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const child = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    `http://127.0.0.1:${PORT}`
  ]);

  child.on('error', (err) => {
    console.error('Failed to spawn Edge:', err);
  });

  // Fallback timeout in 30 seconds
  setTimeout(() => {
    console.log('Timeout reached. Closing server.');
    server.close();
    process.exit(1);
  }, 30000);
});
