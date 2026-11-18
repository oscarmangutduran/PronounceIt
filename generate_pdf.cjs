const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const assetsDir = path.join(rootDir, 'client', 'assets');

function getImageBase64(filename) {
  try {
    const fullPath = path.join(assetsDir, filename);
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(filename).replace('.', '');
      const mime =
        ext === 'svg'
          ? 'image/svg+xml'
          : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : 'image/png';
      const base64 = fs.readFileSync(fullPath).toString('base64');
      return `data:${mime};base64,${base64}`;
    }
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
  }
  return '';
}

const iconBase64 =
  getImageBase64('icon.png') ||
  getImageBase64('splash-icon.png') ||
  getImageBase64('favicon.png');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>PronounceIt - Manual de Usuario</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 15mm 14mm 15mm;
      background-color: #0f0c18;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #f1f5f9;
      background-color: #0f0c18;
      line-height: 1.6;
      font-size: 10.5pt;
      -webkit-font-smoothing: antialiased;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .doc-running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid rgba(230, 46, 76, 0.35);
      padding-bottom: 6px;
      margin-bottom: 18px;
      font-size: 8.5pt;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-weight: 700;
    }

    .doc-running-header .app-badge {
      color: #ff4d6d;
      font-weight: 800;
    }

    /* PORTADA */
    .cover-page {
      min-height: 93vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 36px 26px 24px 26px;
      background: radial-gradient(circle at 50% 18%, #2a143d 0%, #161124 52%, #0f0c18 100%);
      border: 1.5px solid rgba(230, 46, 76, 0.4);
      border-radius: 22px;
      page-break-after: always;
      break-after: page;
    }

    .cover-top {
      text-align: center;
      margin-top: 24px;
    }

    .cover-logo-container {
      margin-bottom: 22px;
      display: inline-block;
      padding: 16px;
      background: linear-gradient(135deg, rgba(230, 46, 76, 0.25) 0%, rgba(22, 17, 36, 0.95) 100%);
      border: 1.5px solid rgba(255, 77, 109, 0.5);
      border-radius: 28px;
      box-shadow: 0 12px 30px -5px rgba(230, 46, 76, 0.45);
    }

    .cover-logo-img {
      width: 104px;
      height: 104px;
      border-radius: 22px;
      display: block;
      object-fit: cover;
    }

    .cover-title {
      font-size: 38pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -1px;
      line-height: 1.1;
      margin-bottom: 10px;
    }

    .cover-title span {
      color: #ff4d6d;
    }

    .cover-subtitle {
      font-size: 13.5pt;
      font-weight: 500;
      color: #cbd5e1;
      max-width: 520px;
      margin: 0 auto 24px auto;
      line-height: 1.45;
    }

    .cover-badge-row {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 30px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 8.5pt;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
    }

    .badge-crimson { background: rgba(230, 46, 76, 0.2); color: #ff758c; border: 1px solid rgba(230, 46, 76, 0.45); }
    .badge-purple { background: rgba(147, 51, 234, 0.2); color: #d8b4fe; border: 1px solid rgba(147, 51, 234, 0.45); }
    .badge-green { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.45); }
    .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.45); }

    .cover-summary-card {
      background: #161124;
      border: 1px solid rgba(230, 46, 76, 0.35);
      border-radius: 16px;
      padding: 22px 28px;
      max-width: 580px;
      margin: 0 auto;
      text-align: left;
    }

    .cover-summary-card h4 {
      font-size: 11.5pt;
      color: #ff4d6d;
      margin-bottom: 8px;
    }

    .cover-summary-card p {
      font-size: 9.5pt;
      color: #cbd5e1;
      line-height: 1.55;
      margin-bottom: 0;
    }

    .cover-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #94a3b8;
    }

    /* ÍNDICE */
    .toc-container {
      background: #161124;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 22px 26px;
      margin-bottom: 24px;
    }

    .toc-title {
      font-size: 18pt;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e62e4c;
    }

    .toc-list {
      list-style: none;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px dotted rgba(255, 255, 255, 0.12);
      font-size: 10pt;
      color: #f1f5f9;
      font-weight: 600;
    }

    .toc-item span.sec-tag {
      color: #ff4d6d;
      font-weight: 800;
      font-size: 9pt;
    }

    /* TEXTOS Y SECCIONES */
    h1 {
      font-size: 17pt;
      font-weight: 800;
      color: #ffffff;
      margin-top: 10px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid rgba(230, 46, 76, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h1 .sec-number {
      background: #e62e4c;
      color: #ffffff;
      font-size: 11pt;
      padding: 3px 10px;
      border-radius: 8px;
      font-weight: 800;
    }

    h2 {
      font-size: 12.5pt;
      font-weight: 700;
      color: #ff758c;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    p {
      margin-bottom: 10px;
      color: #cbd5e1;
    }

    ul, ol {
      margin-left: 20px;
      margin-bottom: 12px;
      color: #cbd5e1;
    }

    li {
      margin-bottom: 6px;
    }

    strong {
      color: #ffffff;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin: 12px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .feature-card {
      background: #161124;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 14px;
    }

    .feature-card-header {
      font-size: 10.5pt;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .feature-card p {
      font-size: 9pt;
      color: #cbd5e1;
      margin-bottom: 0;
      line-height: 1.45;
    }

    .step-item {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      background: #161124;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 11px 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .step-number {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #e62e4c;
      color: #ffffff;
      font-weight: 800;
      font-size: 9.5pt;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .step-title {
      font-weight: 800;
      font-size: 10pt;
      color: #ffffff;
      margin-bottom: 2px;
    }

    .step-desc {
      font-size: 9pt;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .callout {
      padding: 12px 16px;
      border-radius: 12px;
      margin: 12px 0;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      font-size: 9.5pt;
      background: rgba(230, 46, 76, 0.12);
      border: 1px solid rgba(230, 46, 76, 0.35);
      border-left: 4px solid #e62e4c;
      color: #ffe4e6;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .callout strong {
      display: block;
      color: #ff758c;
      margin-bottom: 3px;
    }

    .callout-amber {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-left: 4px solid #f59e0b;
      color: #fef3c7;
    }
    .callout-amber strong {
      color: #fbbf24;
    }

    .example-box {
      background: #1c152e;
      border: 1px solid rgba(230, 46, 76, 0.35);
      border-radius: 12px;
      padding: 14px 18px;
      margin: 12px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 9pt;
      border-radius: 10px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background: #231b3b;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 8px 12px;
      border: 1px solid rgba(230, 46, 76, 0.35);
    }

    td {
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      background: #161124;
    }

    tr:nth-child(even) td {
      background: #1c152e;
    }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="cover-page">
    <div class="cover-top">
      <div class="cover-logo-container">
        ${
          iconBase64
            ? `<img src="${iconBase64}" alt="PronounceIt Logo" class="cover-logo-img">`
            : '<div style="width:104px;height:104px;background:#e62e4c;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:32pt;font-weight:900;">P</div>'
        }
      </div>
      <h1 class="cover-title" style="border:none; justify-content:center; margin-top:0;">Pronounce<span>It</span></h1>
      <p class="cover-subtitle">Guía Práctica de Usuario: Cómo aprender vocabulario, mejorar tu pronunciación y mantener tu racha día a día</p>

      <div class="cover-badge-row">
        <span class="badge badge-crimson">📱 Móvil y Ordenador</span>
        <span class="badge badge-amber">🔥 Contador de Rachas</span>
        <span class="badge badge-purple">🔊 Pronunciación Fácil</span>
        <span class="badge badge-green">🌍 Hasta 10 Idiomas</span>
      </div>

      <div class="cover-summary-card">
        <h4>👋 ¡Bienvenido a PronounceIt!</h4>
        <p>Este manual te explica de forma sencilla y paso a paso cómo aprovechar cada rincón de la aplicación: desde cómo guardar tus primeras palabras y escuchar cómo se pronuncian, hasta cómo organizar tus propios temas de estudio, mantener tu racha diaria encendida, practicar con tarjetas, hacer exámenes y hablar en vivo con otros estudiantes.</p>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong style="color:#ffffff;">PronounceIt — Manual de Usuario</strong><br>
        <span>Guía paso a paso para estudiantes</span>
      </div>
      <div style="text-align:right;">
        <span>Versión 1.7.2</span>
      </div>
    </div>
  </div>

  <!-- PÁGINA 2: ÍNDICE Y QUÉ ES PRONOUNCEIT -->
  <div class="doc-running-header">
    <span>PronounceIt &bull; Manual de Usuario</span>
    <span class="app-badge">Índice y Bienvenida</span>
  </div>

  <div class="toc-container">
    <div class="toc-title">¿Qué encontrarás en esta guía?</div>
    <ul class="toc-list">
      <li class="toc-item"><span>1. ¿Para qué sirve PronounceIt y cómo te ayuda?</span><span class="sec-tag">Sección 1</span></li>
      <li class="toc-item"><span>2. Cómo instalar la app en tu móvil (Android e iPhone) o usarla en el ordenador</span><span class="sec-tag">Sección 2</span></li>
      <li class="toc-item"><span>3. Tu cuenta, tus idiomas de estudio y tu perfil</span><span class="sec-tag">Sección 3</span></li>
      <li class="toc-item"><span>4. Cómo guardar palabras nuevas sin esfuerzo</span><span class="sec-tag">Sección 4</span></li>
      <li class="toc-item"><span>5. Cómo organizar, editar y eliminar tus Categorías y Subcategorías</span><span class="sec-tag">Sección 5</span></li>
      <li class="toc-item"><span>6. Cómo funciona tu Racha Diaria (🔥)</span><span class="sec-tag">Sección 6</span></li>
      <li class="toc-item"><span>7. Practicar con Tarjetas de Memoria (Flashcards)</span><span class="sec-tag">Sección 7</span></li>
      <li class="toc-item"><span>8. Ponerte a prueba con los Exámenes (Tests)</span><span class="sec-tag">Sección 8</span></li>
      <li class="toc-item"><span>9. Consultar tus Estadísticas y tu avance</span><span class="sec-tag">Sección 9</span></li>
      <li class="toc-item"><span>10. Aulas de Voz 24/7 para practicar hablando y Ajustes de la app</span><span class="sec-tag">Sección 10</span></li>
    </ul>
  </div>

  <h1><span class="sec-number">1</span> ¿Para qué sirve PronounceIt?</h1>
  <p>Cuando aprendemos un idioma como el inglés, muchas veces apuntamos palabras sueltas en una libreta o en el móvil, pero al cabo de unos días olvidamos <strong>cómo se pronuncian realmente</strong> o en qué frases se usan. <strong>PronounceIt</strong> es tu cuaderno inteligente de vocabulario y pronunciación:</p>

  <div class="grid-2">
    <div class="feature-card">
      <div class="feature-card-header">🔊 Te enseña a pronunciar sin dudas</div>
      <p>Cada palabra te muestra cómo se lee con letras españolas fáciles de entender (por ejemplo, <em>schedule</em> &rarr; <strong>"shéd-yul"</strong>) y tiene un botón de altavoz para que la escuches al instante.</p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">✨ Rellena todo por ti</div>
      <p>Tú solo escribes la palabra (en inglés o en español) y la app busca automáticamente su traducción, cómo se pronuncia, qué tipo de palabra es y dos frases de ejemplo.</p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">🔥 Te ayuda a ser constante</div>
      <p>Con el contador de rachas diarias, cada día que agregas palabras nuevas sumas un día a tu racha para mantener la motivación alta.</p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">🎯 Practicas a tu ritmo</div>
      <p>Puedes repasar tus palabras con tarjetas giratorias (Flashcards), hacer exámenes tipo test por temas o niveles y practicar verbos irregulares.</p>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- PÁGINA 3: INSTALACIÓN Y CUENTA -->
  <div class="doc-running-header">
    <span>PronounceIt &bull; Manual de Usuario</span>
    <span class="app-badge">Instalación y Cuenta</span>
  </div>

  <h1><span class="sec-number">2</span> Cómo entrar e instalar la App</h1>
  <p>Puedes usar PronounceIt desde cualquier ordenador, tablet o teléfono móvil. Todo lo que hagas en tu cuenta se guarda para que puedas seguir estudiando desde cualquier pantalla.</p>

  <div class="step-item">
    <div class="step-number">1</div>
    <div>
      <div class="step-title">Desde el navegador (Ordenador, Tablet o Móvil)</div>
      <div class="step-desc">Entra directamente en <strong>https://pronounceit-sand.vercel.app</strong> sin necesidad de instalar nada.</div>
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">2</div>
    <div>
      <div class="step-title">En teléfonos Android (App Oficial)</div>
      <div class="step-desc">Pulsa el botón <strong>"Android (APK)"</strong> que aparece en la pantalla de inicio o dentro de <em>Configuración</em>. Una vez descargado el archivo, ábrelo y pulsa <strong>Instalar</strong>. Al abrir la app verás una breve animación de bienvenida y entrarás directamente a tu espacio de estudio.</div>
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">3</div>
    <div>
      <div class="step-title">En iPhone o iPad (Apple iOS)</div>
      <div class="step-desc">Abre la web en Safari y pulsa el botón <strong>"Apple (iOS)"</strong>. Te aparecerá una guía en pantalla explicándote cómo pulsar el botón <em>Compartir</em> y elegir <strong>"Añadir a pantalla de inicio"</strong> para tener el icono de PronounceIt junto al resto de tus apps.</div>
    </div>
  </div>

  <h1><span class="sec-number">3</span> Tu Cuenta, tus Idiomas y tu Perfil</h1>

  <h2>Crear cuenta o iniciar sesión</h2>
  <ul>
    <li><strong>Crear Cuenta:</strong> Si es tu primera vez, pulsa en la pestaña <em>Crear Cuenta</em>, escribe tu nombre, usuario, correo y contraseña, y elige cuál es tu idioma nativo y qué idioma quieres aprender.</li>
    <li><strong>Iniciar Sesión:</strong> Puedes entrar escribiendo tu correo electrónico o simplemente tu nombre de usuario.</li>
    <li><strong>¿Olvidaste tu contraseña?:</strong> Pulsa en <em>"¿Olvidaste tu contraseña?"</em> y recibirás una clave temporal en tu correo para entrar y elegir una nueva.</li>
  </ul>

  <h2>Estudiar varios idiomas a la vez</h2>
  <p>En la parte superior derecha verás la <strong>bandera del idioma</strong> que estás estudiando ahora mismo y un botón con el símbolo <strong><code>+</code></strong>:</p>
  <ul>
    <li>Si pulsas el botón <strong><code>+</code></strong>, puedes añadir otro idioma (Inglés, Francés, Alemán, Italiano, Portugués, Ruso, Chino, Japonés, Árabe o Español).</li>
    <li>Cada idioma tiene su propia pizarra independiente: tus palabras de francés nunca se mezclarán con tus palabras de inglés. Puedes cambiar de un idioma a otro tocando la bandera superior.</li>
  </ul>

  <h2>Modo Oscuro, Modo Claro y Foto de Perfil</h2>
  <ul>
    <li><strong>Sol / Luna (☀️ / 🌙):</strong> Pulsa el icono del sol o la luna arriba a la derecha para cambiar entre el fondo oscuro (ideal para descansar la vista) y el fondo claro.</li>
    <li><strong>Tu Foto y Nombre:</strong> Toca tu círculo de perfil arriba a la derecha y elige <em>"Editar perfil"</em> para subir una foto desde tu galería o cambiar tu nombre.</li>
  </ul>

  <div class="page-break"></div>

  <!-- PÁGINA 4: AÑADIR PALABRAS Y CATEGORÍAS -->
  <div class="doc-running-header">
    <span>PronounceIt &bull; Manual de Usuario</span>
    <span class="app-badge">Vocabulario y Categorías</span>
  </div>

  <h1><span class="sec-number">4</span> Cómo guardar palabras nuevas</h1>
  <p>En la pantalla principal (<strong>Vocabulario</strong>) verás todas tus palabras ordenadas con su traducción, cómo se pronuncian y su nivel (desde A1 para principiantes hasta C2 para nivel muy avanzado).</p>

  <div class="step-item">
    <div class="step-number">1</div>
    <div>
      <div class="step-title">Pulsa en "+ Nueva Palabra"</div>
      <div class="step-desc">Se abrirá la ventana para registrar una palabra nueva.</div>
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">2</div>
    <div>
      <div class="step-title">Escribe en el idioma que quieras</div>
      <div class="step-desc">Puedes elegir si prefieres escribir la palabra en el idioma que estudias (por ejemplo, <em>Inglés</em>) o escribirla en <em>Español</em> para que la app te diga cómo es en inglés.</div>
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">3</div>
    <div>
      <div class="step-title">Rellenado automático</div>
      <div class="step-desc">Al escribir la palabra (o pulsar el botón <strong>✨ IA</strong>), la aplicación completa automáticamente su traducción, una frase de ejemplo con su traducción, el tipo de palabra (sustantivo, verbo, adjetivo...) y su guía de pronunciación. Puedes tocar <strong>"Escuchar" 🔊</strong> para oír cómo suena antes de guardarla.</div>
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">4</div>
    <div>
      <div class="step-title">Guarda cómodamente</div>
      <div class="step-desc">Pulsa el botón <strong>"Guardar"</strong> (disponible tanto en la esquina superior derecha de la ventana como en el botón grande inferior) y la palabra quedará añadida a tu lista.</div>
    </div>
  </div>

  <h1><span class="sec-number">5</span> Cómo organizar, editar y eliminar Categorías y Subcategorías</h1>
  <p>Para no tener todas las palabras revueltas, puedes agruparlas en <strong>Categorías principales</strong> (por ejemplo: <em>Trabajo, Viajes, Comida</em>) y dentro de ellas crear <strong>Subcategorías</strong> más concretas (por ejemplo, dentro de <em>Viajes</em>: <em>Aeropuerto, Hotel, Restaurante</em>).</p>

  <div class="grid-3">
    <div class="feature-card">
      <div class="feature-card-header">➕ Crear</div>
      <p>Pulsa el botón <strong>"+ Categoría"</strong> (o <strong>"+ Subcategoría"</strong> cuando tengas una categoría seleccionada) para crear un nuevo tema en segundos.</p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">✏️ Editar</div>
      <p>Toca el icono del <strong>lápiz (✏️)</strong> que aparece sobre cualquier categoría o subcategoría para cambiarle el nombre o añadirle y quitarle subcategorías.</p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">🗑️ Eliminar</div>
      <p>Toca el icono de la <strong>papelera (🗑️)</strong> en la propia etiqueta de la categoría o subcategoría (o dentro del selector al crear una palabra) para borrarla cuando ya no la necesites.</p>
    </div>
  </div>

  <div class="callout">
    <div>💡</div>
    <div>
      <strong>Filtros rápidos para encontrar cualquier palabra al instante</strong>
      Además de tus categorías, puedes filtrar tu lista por <strong>Todas</strong>, <strong>Favoritas ⭐</strong> (las que marques con una estrella), <strong>Por repasar</strong>, por <strong>Nivel (A1 a C2)</strong> o usar la barra de búsqueda para encontrar cualquier palabra en un segundo.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- PÁGINA 5: CONTADOR DE RACHAS, FLASHCARDS Y TESTS -->
  <div class="doc-running-header">
    <span>PronounceIt &bull; Manual de Usuario</span>
    <span class="app-badge">Rachas, Flashcards y Tests</span>
  </div>

  <h1><span class="sec-number">6</span> Cómo funciona el Contador de Rachas (🔥)</h1>
  <p>El secreto para dominar un idioma es aprender un poquito cada día. Por eso, en la barra superior de la aplicación verás siempre el icono de la <strong>llama (🔥) con un número</strong>:</p>

  <ul>
    <li><strong>¿Cómo sube tu racha?:</strong> Cada día que agregues al menos <strong>1 palabra nueva</strong> a tu vocabulario, sumarás un día a tu racha y la llama se encenderá en color naranja.</li>
    <li><strong>¿Qué pasa si tocas la llama?:</strong> Se abrirá una ventana especial donde podrás ver:
      <ul>
        <li>Cuántos <strong>días seguidos</strong> llevas en racha y cuántas palabras has agregado hoy.</li>
        <li>Un <strong>calendario de los últimos 7 días (L M X J V S D)</strong> que marca con una llama cada día que cumpliste y cuántas palabras añadiste ese día.</li>
        <li>Tu <strong>Mejor racha histórica</strong> y el total de días que has estudiado.</li>
      </ul>
    </li>
  </ul>

  <h1><span class="sec-number">7</span> Practicar con Tarjetas (Flashcards)</h1>
  <p>En la pestaña <strong>Flashcards</strong> puedes repasar tus palabras como si fueran tarjetas de cartulina:</p>

  <div class="example-box">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <span style="font-size:15pt; font-weight:800; color:#ffffff;">Breakthrough</span>
        <span style="margin-left:8px; color:#ff758c; font-weight:700;">/ˈbreɪk.θruː/ &bull; "bréik-zru"</span>
      </div>
      <span style="background:#e62e4c; color:#fff; padding:4px 10px; border-radius:99px; font-size:8.5pt; font-weight:700;">🔊 Escuchar</span>
    </div>
    <p style="margin-top:8px; margin-bottom:0; font-size:9pt; color:#94a3b8;">
      👉 <strong>Cara delantera:</strong> Ves la palabra, cómo se pronuncia y escuchas su sonido.<br>
      👉 <strong>Al tocar la tarjeta se gira:</strong> Te descubre su significado en español (<em>"Gran avance / logro"</em>) y su frase de ejemplo.
    </p>
  </div>

  <p>Debajo de cada tarjeta tienes botones para indicar si <strong>necesitas repasarla más</strong> o si <strong>ya la dominas</strong>, además de poder mezclarlas al azar o elegir practicar solo una categoría o nivel concreto.</p>

  <h1><span class="sec-number">8</span> Ponerte a prueba con los Exámenes (Tests)</h1>
  <p>En la pestaña <strong>Test</strong> puedes comprobar cuánto has aprendido con 4 tipos de exámenes rápidos:</p>

  <table>
    <thead>
      <tr>
        <th style="width:32%;">Tipo de Examen</th>
        <th style="width:68%;">¿En qué consiste?</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Test de Vocabulario</strong></td>
        <td>Preguntas tipo test sobre las palabras de tu lista. Puedes hacerlo de todas tus palabras o elegir un nivel concreto (A1, A2, B1, B2, C1 o C2).</td>
      </tr>
      <tr>
        <td><strong>2. Test por Categoría o Subcategoría</strong></td>
        <td>Ideal si quieres examinarte únicamente de un tema específico (por ejemplo, repasar solo las palabras de tu categoría <em>Trabajo</em> o de la subcategoría <em>Reuniones</em>).</td>
      </tr>
      <tr>
        <td><strong>3. Test por Tipo de Palabra</strong></td>
        <td>Para practicar únicamente verbos, adjetivos, sustantivos, adverbios o expresiones (<em>Phrasal Verbs</em>).</td>
      </tr>
      <tr>
        <td><strong>4. Verbos Irregulares</strong></td>
        <td>Un entrenador especial donde completas las formas de pasado y participio de los verbos irregulares más importantes del inglés.</td>
      </tr>
    </tbody>
  </table>

  <p>Al terminar cualquier examen, la app te dará tu <strong>nota sobre 10</strong>, te mostrará qué preguntas acertaste o fallaste y guardará la nota en tu historial.</p>

  <div class="page-break"></div>

  <!-- PÁGINA 6: ESTADÍSTICAS, AULAS DE VOZ Y CONFIGURACIÓN -->
  <div class="doc-running-header">
    <span>PronounceIt &bull; Manual de Usuario</span>
    <span class="app-badge">Estadísticas, Comunidad y Ajustes</span>
  </div>

  <h1><span class="sec-number">9</span> Consultar tus Estadísticas y Progreso</h1>
  <p>En la pestaña <strong>Estadísticas</strong> tienes un resumen muy visual de todo tu avance:</p>
  <ul>
    <li><strong>Panel de Racha Diaria:</strong> Tus días seguidos agregando palabras, tu récord de días y el calendario de la última semana.</li>
    <li><strong>Resumen de Palabras:</strong> Cuántas palabras tienes en total, cuántas has marcado ya como <em>Dominadas</em>, cuántas tienes <em>En repaso</em> y tu porcentaje global de dominio.</li>
    <li><strong>Gráfico por Niveles (A1 a C2):</strong> Barras de progreso que te muestran de qué niveles tienes más vocabulario.</li>
    <li><strong>Historial de Exámenes:</strong> Lista con las notas y fechas de todos los tests que has completado.</li>
  </ul>

  <h1><span class="sec-number">10</span> Aulas de Voz 24/7 y Ajustes de la App</h1>
  <p>En la pestaña <strong>Configuración</strong> puedes personalizar la app a tu gusto y conectar con la comunidad:</p>

  <div class="grid-2">
    <div class="feature-card">
      <div class="feature-card-header">🎙️ Aulas de Voz 24/7 en Discord</div>
      <p>¿Quieres practicar hablando con otras personas? Elige el idioma que estás estudiando y pulsa <strong>"Crear Sala y Entrar"</strong>. Se abrirá una sala de voz en directo para conversar, practicar pronunciación y resolver dudas con otros estudiantes.</p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">🗣️ Velocidad y Tono de la Voz</div>
      <p>Si sientes que la voz habla demasiado rápido o demasiado lento al pronunciar las palabras, puedes elegir entre velocidad <strong>Lenta, Normal o Rápida</strong> y probar cómo suena al momento.</p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">📊 Guardar tus palabras en Excel (.CSV)</div>
      <p>En el apartado <em>Copia de Seguridad y Datos</em> puedes descargar todas tus palabras en un archivo compatible con Excel para tenerlas guardadas o imprimirlas, así como importar listas de palabras fácilmente.</p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">📬 Soporte y Contacto Directo</div>
      <p>Desde la misma pantalla de Configuración tienes botones directos para escribir por correo si tienes cualquier duda o sugerencia, conectar por LinkedIn o apoyar el proyecto.</p>
    </div>
  </div>

  <div class="callout callout-amber" style="margin-top:18px;">
    <div>🌟</div>
    <div>
      <strong>Consejo para avanzar más rápido</strong>
      Dedica solo 5 minutos al día: añade <strong>2 o 3 palabras nuevas</strong> para mantener tu racha (🔥) encendida, escúchalas un par de veces con el altavoz (🔊) fijándote en la guía de pronunciación y haz una partida rápida de <em>Flashcards</em> o <em>Test</em> antes de cerrar la app.
    </div>
  </div>

  <div style="margin-top:28px; padding:20px; background:#161124; border:1px solid rgba(230, 46, 76, 0.35); border-radius:14px; text-align:center;">
    <h3 style="color:#ffffff; margin-bottom:6px; font-size:12pt;">🎉 ¡Disfruta aprendiendo con PronounceIt!</h3>
    <p style="font-size:9.5pt; color:#cbd5e1; margin-bottom:8px; text-align:center;">Tu compañero diario para hablar con seguridad, ampliar tu vocabulario y perfeccionar tu pronunciación.</p>
    <div style="font-size:9pt; color:#ff4d6d; font-weight:800;">
      PronounceIt v1.7.2 &bull; Manual Oficial de Usuario
    </div>
  </div>

</body>
</html>
`;

const htmlPath = path.join(rootDir, 'manual_usuario.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML manual generated at:', htmlPath);

const pdfPath = path.join(rootDir, 'Guia_de_Usuario_PronounceIt_v1.7.2.pdf');
const fallbackPdfPath = path.join(rootDir, 'Manual_de_Usuario_PronounceIt.pdf');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  htmlPath,
];

console.log('Starting Edge PDF rendering...');
const child = spawn(edgePath, args, { stdio: 'inherit' });

child.on('exit', (code) => {
  if (code === 0 && fs.existsSync(pdfPath)) {
    try {
      fs.copyFileSync(pdfPath, fallbackPdfPath);
    } catch {}
    const stats = fs.statSync(pdfPath);
    console.log('PDF generated successfully!');
    console.log('Path:', pdfPath);
    console.log('Size:', (stats.size / 1024).toFixed(2), 'KB');
  } else {
    console.error('Edge exited with code:', code);
  }
});
