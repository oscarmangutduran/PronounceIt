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
  <h1>Generating Icons with UK Flag...</h1>
  <div id="status">Starting...</div>

  <script>
    async function run() {
      const status = document.getElementById('status');
      
      const svgDefs = \`
        <defs>
          <!-- Background squircle clip -->
          <clipPath id="squircle">
            <rect width="64" height="64" rx="16"/>
          </clipPath>
          <clipPath id="circleClip">
            <circle cx="32" cy="32" r="31"/>
          </clipPath>

          <!-- Subtle border highlight with neon glow -->
          <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff4d6d" stop-opacity="0.9"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#e62e4c" stop-opacity="0.3"/>
          </linearGradient>

          <!-- Vignette / dark overlay on top of flag to make P pop -->
          <radialGradient id="flagVignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#0a0518" stop-opacity="0.25"/>
            <stop offset="60%" stop-color="#070312" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#020006" stop-opacity="0.75"/>
          </radialGradient>

          <!-- Ambient glow behind the letter -->
          <radialGradient id="ambientGlow" cx="45%" cy="38%" r="52%">
            <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
            <stop offset="65%" stop-color="#000000" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>

          <!-- Drop shadow for the P and sound waves -->
          <filter id="logoShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000000" flood-opacity="0.9"/>
          </filter>

          <!-- Main Letter P gradient -->
          <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="35%" stop-color="#ff5470"/>
            <stop offset="100%" stop-color="#e62e4c"/>
          </linearGradient>

          <!-- Sound waves gradient -->
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#ff758c"/>
            <stop offset="100%" stop-color="#c084fc"/>
          </linearGradient>
        </defs>
      \`;

      const flagMarkup = \`
        <!-- Blue field -->
        <rect width="64" height="64" fill="#012169"/>
        <!-- White saltire diagonals (St Andrew) -->
        <path d="M0,0 L64,64 M64,0 L0,64" stroke="#ffffff" stroke-width="12.8"/>
        <!-- Red saltire diagonals counterchanged (St Patrick) -->
        <path d="M0,0 L32,32" stroke="#C8102E" stroke-width="4.2" transform="translate(0, -2.1)"/>
        <path d="M32,32 L64,64" stroke="#C8102E" stroke-width="4.2" transform="translate(0, 2.1)"/>
        <path d="M64,0 L32,32" stroke="#C8102E" stroke-width="4.2" transform="translate(2.1, 0)"/>
        <path d="M32,32 L0,64" stroke="#C8102E" stroke-width="4.2" transform="translate(-2.1, 0)"/>
        <!-- White St George cross -->
        <path d="M32,0 V64 M0,32 H64" stroke="#ffffff" stroke-width="12.8"/>
        <!-- Red St George cross -->
        <path d="M32,0 V64 M0,32 H64" stroke="#C8102E" stroke-width="7.6"/>
        <!-- Vignette overlay for depth and contrast -->
        <rect width="64" height="64" fill="url(#flagVignette)"/>
        <!-- Ambient dark backing behind letter P -->
        <circle cx="28" cy="26" r="22" fill="url(#ambientGlow)"/>
      \`;

      const pLogoMarkup = \`
        <g filter="url(#logoShadow)">
          <!-- Stylized 'P' Stem -->
          <rect x="14" y="14" width="7" height="36" rx="3.5" fill="url(#primaryGrad)"/>
          <!-- Loop of the 'P' -->
          <path d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z" fill="url(#primaryGrad)"/>
          <!-- Hollow inner loop with crisp dark velvet backing -->
          <path d="M 21 20 H 27.5 C 31.5 20 33 21.8 33 24.5 C 33 27.2 31.5 29 27.5 29 H 21 Z" fill="#0d081a"/>
          <!-- Sound Waves emanating from the 'P' -->
          <path d="M 43 18.5 C 46.5 22 46.5 27 43 30.5" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round"/>
          <path d="M 49.5 14 C 55 19.5 55 29.5 49.5 35" fill="none" stroke="url(#waveGrad)" stroke-width="3" stroke-linecap="round" opacity="0.95"/>
        </g>
      \`;

      // 1. Squircle Icon (Favicon, Apple Touch Icon, PWA Icons)
      const faviconSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
          \${svgDefs}
          <g clip-path="url(#squircle)">
            \${flagMarkup}
          </g>
          <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="none" stroke="url(#borderGrad)" stroke-width="1.5"/>
          \${pLogoMarkup}
        </svg>
      \`;

      // 2. Full Square App Icon (1024x1024 for Google Play / standard icon.png)
      const fullSquareIconSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">
          \${svgDefs}
          \${flagMarkup}
          \${pLogoMarkup}
        </svg>
      \`;

      // 3. Round Icon (for legacy circular launcher icon)
      const roundIconSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
          \${svgDefs}
          <g clip-path="url(#circleClip)">
            \${flagMarkup}
          </g>
          <circle cx="32" cy="32" r="30.5" fill="none" stroke="url(#borderGrad)" stroke-width="1"/>
          \${pLogoMarkup}
        </svg>
      \`;

      // 4. Adaptive Foreground (108x108 viewport, safe circle is 72x72 in center)
      // Contains the 'P' and sound waves centered in the 108x108 canvas (64x64 placed at 22,22)
      const adaptiveForegroundSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="1024" height="1024">
          \${svgDefs}
          <g transform="translate(22, 22)">
            \${pLogoMarkup}
          </g>
        </svg>
      \`;

      // 5. Adaptive Background (108x108 viewport filled with the UK Flag so any Android mask shape shows the full UK flag logo)
      const adaptiveBackgroundSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="1024" height="1024">
          \${svgDefs}
          <g transform="scale(1.6875)">
            \${flagMarkup}
          </g>
        </svg>
      \`;

      // 6. Adaptive Monochrome (Android 13+ themed icon)
      const adaptiveMonochromeSvg = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="1024" height="1024">
          <g transform="translate(54, 54) scale(1.18) translate(-35.25, -32)">
            <rect x="14" y="14" width="7" height="36" rx="3.5" fill="#ffffff"/>
            <path d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z" fill-rule="evenodd" fill="#ffffff"/>
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

      // 1. Assets icons (Expo app config & web) - EXACT same logo across all platforms!
      results['assets/icon.png'] = await renderSvg(fullSquareIconSvg, 1024, 1024, 'image/png');
      results['assets/android-icon-foreground.png'] = await renderSvg(adaptiveForegroundSvg, 1024, 1024, 'image/png');
      results['assets/android-icon-background.png'] = await renderSvg(adaptiveBackgroundSvg, 1024, 1024, 'image/png');
      results['assets/android-icon-monochrome.png'] = await renderSvg(adaptiveMonochromeSvg, 1024, 1024, 'image/png');
      results['assets/favicon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');
      results['assets/splash-icon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');

      // 1.1 Sync to client/src/assets as well
      results['src/assets/icon.png'] = await renderSvg(fullSquareIconSvg, 1024, 1024, 'image/png');
      results['src/assets/android-icon-foreground.png'] = await renderSvg(adaptiveForegroundSvg, 1024, 1024, 'image/png');
      results['src/assets/android-icon-background.png'] = await renderSvg(adaptiveBackgroundSvg, 1024, 1024, 'image/png');
      results['src/assets/android-icon-monochrome.png'] = await renderSvg(adaptiveMonochromeSvg, 1024, 1024, 'image/png');
      results['src/assets/favicon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');
      results['src/assets/splash-icon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');

      // 1.2 Web & PWA public icons (apple-touch-icon uses fullSquareIconSvg because iOS applies its own squircle mask)
      results['public/favicon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');
      results['public/apple-touch-icon.png'] = await renderSvg(fullSquareIconSvg, 180, 180, 'image/png');
      results['public/icon-192.png'] = await renderSvg(faviconSvg, 192, 192, 'image/png');
      results['public/icon-512.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');
      results['public/icon-192-maskable.png'] = await renderSvg(fullSquareIconSvg, 192, 192, 'image/png');
      results['public/icon-512-maskable.png'] = await renderSvg(fullSquareIconSvg, 512, 512, 'image/png');

      // 1.3 Also sync to client/dist for immediate web/PWA production builds
      results['dist/favicon.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');
      results['dist/apple-touch-icon.png'] = await renderSvg(fullSquareIconSvg, 180, 180, 'image/png');
      results['dist/icon-192.png'] = await renderSvg(faviconSvg, 192, 192, 'image/png');
      results['dist/icon-512.png'] = await renderSvg(faviconSvg, 512, 512, 'image/png');
      results['dist/icon-192-maskable.png'] = await renderSvg(fullSquareIconSvg, 192, 192, 'image/png');
      results['dist/icon-512-maskable.png'] = await renderSvg(fullSquareIconSvg, 512, 512, 'image/png');

      // 2. Android mipmap density variants & splashscreen_logo
      const densities = [
        { name: 'mdpi', iconSize: 48, adaptiveSize: 108, splashSize: 72 },
        { name: 'hdpi', iconSize: 72, adaptiveSize: 162, splashSize: 108 },
        { name: 'xhdpi', iconSize: 96, adaptiveSize: 216, splashSize: 144 },
        { name: 'xxhdpi', iconSize: 144, adaptiveSize: 324, splashSize: 216 },
        { name: 'xxxhdpi', iconSize: 192, adaptiveSize: 432, splashSize: 288 }
      ];

      for (const d of densities) {
        const prefix = \`android/app/src/main/res/mipmap-\${d.name}/\`;
        results[\`\${prefix}ic_launcher.webp\`] = await renderSvg(faviconSvg, d.iconSize, d.iconSize, 'image/webp');
        results[\`\${prefix}ic_launcher_round.webp\`] = await renderSvg(roundIconSvg, d.iconSize, d.iconSize, 'image/webp');
        results[\`\${prefix}ic_launcher_foreground.webp\`] = await renderSvg(adaptiveForegroundSvg, d.adaptiveSize, d.adaptiveSize, 'image/webp');
        results[\`\${prefix}ic_launcher_background.webp\`] = await renderSvg(adaptiveBackgroundSvg, d.adaptiveSize, d.adaptiveSize, 'image/webp');
        results[\`\${prefix}ic_launcher_monochrome.webp\`] = await renderSvg(adaptiveMonochromeSvg, d.adaptiveSize, d.adaptiveSize, 'image/webp');

        const drawablePrefix = \`android/app/src/main/res/drawable-\${d.name}/\`;
        results[\`\${drawablePrefix}splashscreen_logo.png\`] = await renderSvg(faviconSvg, d.splashSize, d.splashSize, 'image/png');
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
