/**
 * PronounceIt — Generador del PDF de Especificaciones Técnicas
 * ------------------------------------------------------------
 * Renderiza un documento HTML autocontenido (A4) y lo convierte a PDF
 * usando Microsoft Edge en modo headless (Chromium headless=new).
 *
 * Salidas:
 *   - Especificaciones_Tecnicas_PronounceIt.html
 *   - Especificaciones_Tecnicas_PronounceIt.pdf
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const assetsDir = path.join(rootDir, 'client', 'assets');

// ---------------------------------------------------------------------------
// Helpers: incrustar imágenes del proyecto como data URI
// ---------------------------------------------------------------------------
function getImageBase64(filename) {
  try {
    const fullPath = path.join(assetsDir, filename);
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(filename).replace('.', '').toLowerCase();
      const mime =
        ext === 'svg' ? 'image/svg+xml'
          : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
            : 'image/png';
      return 'data:' + mime + ';base64,' + fs.readFileSync(fullPath).toString('base64');
    }
  } catch (err) {
    console.error('Error leyendo ' + filename + ':', err.message);
  }
  return '';
}

const iconBase64 = getImageBase64('icon.png') || getImageBase64('splash-icon.png') || getImageBase64('favicon.png');

const VERSION = '1.7.1';
const AUTHOR = 'Oscar Mangut Dev';

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Especificaciones Técnicas — PronounceIt v${VERSION}</title>
<style>
  @page { size: A4; margin: 17mm 15mm 16mm 15mm; }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    background: #fff;
    line-height: 1.55;
    font-size: 9.8pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page-break { page-break-after: always; break-after: page; }
  .avoid-break { page-break-inside: avoid; break-inside: avoid; }

  /* ---------- Encabezado / pie corriente ---------- */
  .run-head {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 18px;
    font-size: 7.8pt; color: #64748b; text-transform: uppercase; letter-spacing: .8px; font-weight: 600;
  }
  .run-head .accent { color: #e62e4c; font-weight: 700; }

  /* ---------- Portada ---------- */
  .cover {
    min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between;
    padding: 26px 8px 8px 8px; page-break-after: always; break-after: page;
  }
  .cover-top { text-align: center; margin-top: 34px; }
  .cover-logo {
    display: inline-block; padding: 14px; border-radius: 26px;
    background: linear-gradient(135deg, #1c152e 0%, #231b3b 100%);
    box-shadow: 0 12px 28px -8px rgba(147,51,234,.45); margin-bottom: 22px;
  }
  .cover-logo img { width: 92px; height: 92px; border-radius: 18px; display: block; }
  .cover-kicker {
    font-size: 8.5pt; font-weight: 700; letter-spacing: 2.4px; text-transform: uppercase;
    color: #9333ea; margin-bottom: 10px;
  }
  .cover-title { font-size: 33pt; font-weight: 800; color: #0f0c18; line-height: 1.1; margin-bottom: 10px; }
  .cover-title span { color: #e62e4c; }
  .cover-sub { font-size: 12.5pt; font-weight: 500; color: #475569; max-width: 520px; margin: 0 auto 24px; line-height: 1.4; }
  .cover-author { font-size: 10.5pt; font-weight: 700; color: #1e293b; margin-bottom: 20px; }
  .cover-author span { color: #e62e4c; }
  .cover-badges { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 30px; }
  .badge {
    display: inline-flex; align-items: center; gap: 5px; font-size: 7.6pt; font-weight: 700;
    padding: 5px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: .4px;
  }
  .b-violet { background: #ede9fe; color: #5b21b6; }
  .b-crimson { background: #fce7ec; color: #9f1239; }
  .b-emerald { background: #d1fae5; color: #065f46; }
  .b-cyan { background: #cffafe; color: #155e75; }
  .b-amber { background: #fef3c7; color: #92400e; }
  .b-slate { background: #f1f5f9; color: #334155; }

  .cover-card {
    background: linear-gradient(135deg, #faf8ff 0%, #f4f1fb 100%);
    border: 1px solid #e2e0f0; border-radius: 14px; padding: 22px 26px;
    max-width: 560px; margin: 0 auto; text-align: left;
  }
  .cover-card h4 { font-size: 10.5pt; color: #0f0c18; margin-bottom: 8px; }
  .cover-card p { font-size: 8.6pt; color: #5b6478; line-height: 1.5; }
  .cover-foot {
    border-top: 1.5px solid #e2e8f0; padding-top: 18px;
    display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.2pt; color: #64748b;
  }
  .cover-foot strong { display: block; color: #0f0c18; font-size: 9.2pt; margin-bottom: 3px; }
  .cover-foot .r { text-align: right; }

  /* ---------- Índice ---------- */
  .toc-title {
    font-size: 18pt; font-weight: 800; color: #0f0c18; margin-bottom: 18px;
    padding-bottom: 8px; border-bottom: 2px solid #e62e4c;
  }
  .toc-list { list-style: none; }
  .toc-item { display: flex; align-items: baseline; padding: 6px 0; border-bottom: 1px dotted #cbd5e1; font-size: 9.2pt; }
  .toc-item.l1 { font-weight: 700; color: #0f0c18; padding-top: 10px; font-size: 10pt; }
  .toc-item.l2 { padding-left: 18px; color: #334155; font-weight: 500; }
  .toc-item.l3 { padding-left: 34px; color: #64748b; font-size: 8.6pt; }
  .toc-dots { flex: 1; border-bottom: 1px dotted #94a3b8; margin: 0 9px; }
  .toc-page { font-weight: 700; color: #e62e4c; }

  /* ---------- Tipografía ---------- */
  h1 {
    font-size: 17pt; font-weight: 800; color: #0f0c18; margin: 22px 0 13px;
    padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;
    display: flex; align-items: center; gap: 10px;
    page-break-after: avoid; break-after: avoid;
  }
  h1 .num {
    background: #0f0c18; color: #fff; font-size: 10.5pt; padding: 4px 10px;
    border-radius: 8px; font-weight: 800;
  }
  h2 { font-size: 12.5pt; font-weight: 700; color: #1e293b; margin: 18px 0 9px; page-break-after: avoid; break-after: avoid; }
  h3 { font-size: 10.5pt; font-weight: 700; color: #334155; margin: 13px 0 6px; page-break-after: avoid; break-after: avoid; }
  p { margin-bottom: 9px; color: #334155; text-align: justify; }
  ul, ol { margin: 0 0 11px 19px; color: #334155; }
  li { margin-bottom: 4px; }

  /* ---------- Callouts ---------- */
  .callout {
    padding: 11px 15px; border-radius: 9px; margin: 12px 0; display: flex; gap: 11px;
    align-items: flex-start; font-size: 8.6pt; page-break-inside: avoid; break-inside: avoid;
  }
  .callout .ic { font-size: 13pt; line-height: 1.2; }
  .callout .ct { flex: 1; }
  .callout .ct strong { display: block; margin-bottom: 3px; }
  .co-info { background: #eff6ff; border-left: 4px solid #2563eb; color: #1e40af; }
  .co-info strong { color: #1e3a8a; }
  .co-tip { background: #f0fdf4; border-left: 4px solid #10b981; color: #065f46; }
  .co-tip strong { color: #064e3b; }
  .co-warn { background: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; }
  .co-warn strong { color: #78350f; }
  .co-ai { background: #faf5ff; border-left: 4px solid #9333ea; color: #581c87; }
  .co-ai strong { color: #3b0764; }
  .co-crimson { background: #fff1f2; border-left: 4px solid #e62e4c; color: #9f1239; }
  .co-crimson strong { color: #881337; }

  /* ---------- Tablas ---------- */
  table { width: 100%; border-collapse: collapse; margin: 13px 0; font-size: 8.2pt; page-break-inside: avoid; break-inside: avoid; }
  th { background: #0f0c18; color: #fff; font-weight: 600; text-align: left; padding: 7px 10px; border: 1px solid #1c152e; }
  td { padding: 7px 10px; border: 1px solid #e2e8f0; color: #334155; vertical-align: top; }
  tr:nth-child(even) td { background: #faf9fd; }
  td code, p code, li code {
    font-family: Consolas, Monaco, "Courier New", monospace; background: #f1f5f9; color: #0f0c18;
    padding: 1px 4px; border-radius: 3px; font-size: 7.9pt; border: 1px solid #e2e8f0;
  }

  /* ---------- Rejillas y tarjetas ---------- */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 13px 0; page-break-inside: avoid; break-inside: avoid; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 11px; margin: 13px 0; page-break-inside: avoid; break-inside: avoid; }
  .card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 9px; padding: 13px;
    box-shadow: 0 1px 3px rgba(0,0,0,.05);
  }
  .card-h { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; font-size: 9.4pt; font-weight: 700; color: #0f0c18; }
  .card p { font-size: 8.2pt; color: #64748b; margin-bottom: 0; line-height: 1.45; }

  /* ---------- Pasos ---------- */
  .steps { margin: 13px 0; }
  .step { display: flex; gap: 11px; margin-bottom: 11px; page-break-inside: avoid; break-inside: avoid; }
  .step-n {
    width: 24px; height: 24px; border-radius: 50%; background: #e62e4c; color: #fff;
    font-weight: 700; font-size: 8.4pt; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 2px;
  }
  .step-b { flex: 1; }
  .step-t { font-weight: 700; font-size: 9.2pt; color: #0f0c18; margin-bottom: 2px; }
  .step-d { font-size: 8.3pt; color: #475569; line-height: 1.45; }

  /* ---------- Mockups ---------- */
  .mock {
    border: 1px solid #cbd5e1; border-radius: 9px; background: #0f0c18; color: #e2e8f0;
    padding: 13px 16px; margin: 13px 0; font-size: 8.2pt;
    page-break-inside: avoid; break-inside: avoid;
  }
  .mock-h {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #33294d; padding-bottom: 7px; margin-bottom: 9px;
    font-size: 7.6pt; color: #94a3b8;
  }
  .mock-dots { display: flex; gap: 5px; }
  .mock-dot { width: 7px; height: 7px; border-radius: 50%; background: #e62e4c; }
  .mock-dot:nth-child(2) { background: #f59e0b; }
  .mock-dot:nth-child(3) { background: #10b981; }
  .mock pre { color: #a5b4c8; font-family: Consolas, monospace; font-size: 7.4pt; line-height: 1.4; white-space: pre-wrap; }

  /* ---------- Chips de nivel CEFR ---------- */
  .chip { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 7.2pt; font-weight: 700; margin-right: 3px; text-transform: uppercase; }
  .c-a1 { background: #d1fae5; color: #065f46; }
  .c-a2 { background: #dbeafe; color: #1d4ed8; }
  .c-b1 { background: #fef3c7; color: #b45309; }
  .c-b2 { background: #ffedd5; color: #c2410c; }
  .c-c1 { background: #fee2e2; color: #b91c1c; }
  .c-c2 { background: #f3e8ff; color: #6b21a8; }
  .chip-p { background: #ede9fe; color: #5b21b6; }
  .chip-v { background: #dcfce7; color: #15803d; }
  .chip-a { background: #cffafe; color: #155e75; }

  /* ---------- Árbol de archivos ---------- */
  .tree {
    background: #0f0c18; color: #cbd5e1; border-radius: 9px; padding: 14px 16px;
    font-family: Consolas, Monaco, "Courier New", monospace; font-size: 7.5pt; line-height: 1.5;
    white-space: pre; overflow: hidden; margin: 13px 0;
    page-break-inside: avoid; break-inside: avoid;
  }
  .tree .c { color: #64748b; }
  .tree .d { color: #f59e0b; }
  .tree .f { color: #e2e8f0; }

  /* ---------- Cierre ---------- */
  .closing {
    margin-top: 34px; padding: 20px; background: linear-gradient(135deg, #faf8ff, #f4f1fb);
    border: 1px solid #e2e0f0; border-radius: 11px; text-align: center;
  }
  .closing h3 { color: #0f0c18; margin-bottom: 6px; }
  .closing p { font-size: 8.6pt; color: #64748b; text-align: center; }
  .closing .sig { font-size: 8.8pt; color: #1e293b; font-weight: 700; }
  .closing .fine { font-size: 7.8pt; color: #94a3b8; margin-top: 4px; }
</style>
</head>
<body>

<!-- ===================== PORTADA ===================== -->
<div class="cover">
  <div class="cover-top">
    <div class="cover-logo">
      ${iconBase64 ? '<img src="' + iconBase64 + '" alt="PronounceIt">' : '<div style="width:92px;height:92px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28pt;font-weight:900;">PI</div>'}
    </div>
    <div class="cover-kicker">Documento de Ingeniería</div>
    <h1 class="cover-title">Especificaciones<br>Técnicas de <span>PronounceIt</span></h1>
    <p class="cover-sub">Arquitectura, stack tecnológico, modelo de datos, flujos de trabajo, seguridad y despliegue de la plataforma de aprendizaje de vocabulario y pronunciación</p>
    <div class="cover-author">Arquitectura y Desarrollo: <span>${AUTHOR}</span></div>
    <div class="cover-badges">
      <span class="badge b-violet">React Native + Expo</span>
      <span class="badge b-crimson">Firebase Firestore</span>
      <span class="badge b-cyan">Node + Express</span>
      <span class="badge b-amber">Gemini 2.5 Flash</span>
      <span class="badge b-emerald">Offline-First</span>
      <span class="badge b-slate">v${VERSION}</span>
    </div>
    <div class="cover-card">
      <h4>📐 Alcance del documento</h4>
      <p>Especificación técnica de referencia del monorepo <strong>PronounceIt</strong> (v${VERSION}). Describe la arquitectura multi-capa del sistema, la pila tecnológica seleccionada y su justificación, el esquema de persistencia y su modelo de sincronización Offline-First, los contratos de API REST y callable functions, las reglas de seguridad y Firewall de Firebase, la configuración de entornos y secretos, la estrategia de despliegue multicanal (PWA, APK Android, serverless) y el pipeline de CI/CD asociado.</p>
    </div>
  </div>
  <div class="cover-foot">
    <div>
      <strong>${AUTHOR}</strong>
      <span>Principal Developer &bull; PronounceIt Platform</span>
    </div>
    <div class="r">
      <span>Versión del documento: ${VERSION}.0 &bull; Estado: Producción</span><br>
      <span>© 2026 ${AUTHOR}. Documento técnico de uso interno.</span>
    </div>
  </div>
</div>

<!-- ===================== ÍNDICE ===================== -->
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">Tabla de Contenidos</span></div>
<div class="toc-title">Índice General</div>
<ul class="toc-list">
  <li class="toc-item l1"><span>1. Resumen Ejecutivo</span><span class="toc-dots"></span><span class="toc-page">3</span></li>
  <li class="toc-item l1"><span>2. Arquitectura del Sistema</span><span class="toc-dots"></span><span class="toc-page">4</span></li>
  <li class="toc-item l2"><span>2.1. Vista de Capas</span><span class="toc-dots"></span><span class="toc-page">4</span></li>
  <li class="toc-item l2"><span>2.2. Monorepo y Estructura de Directorios</span><span class="toc-dots"></span><span class="toc-page">5</span></li>
  <li class="toc-item l2"><span>2.3. Modelo de dominio (TypeScript)</span><span class="toc-dots"></span><span class="toc-page">6</span></li>

  <li class="toc-item l1"><span>3. Pila Tecnológica</span><span class="toc-dots"></span><span class="toc-page">7</span></li>
  <li class="toc-item l2"><span>3.1. Runtime de cliente</span><span class="toc-dots"></span><span class="toc-page">7</span></li>
  <li class="toc-item l2"><span>3.2. Servicios de backend</span><span class="toc-dots"></span><span class="toc-page">7</span></li>
  <li class="toc-item l2"><span>3.3. Servicios de terceros</span><span class="toc-dots"></span><span class="toc-page">8</span></li>

  <li class="toc-item l1"><span>4. Capa de Servicios del Cliente</span><span class="toc-dots"></span><span class="toc-page">9</span></li>
  <li class="toc-item l2"><span>4.1. firebaseClient.ts</span><span class="toc-dots"></span><span class="toc-page">9</span></li>
  <li class="toc-item l2"><span>4.2. vocabularyStore.ts</span><span class="toc-dots"></span><span class="toc-page">9</span></li>
  <li class="toc-item l2"><span>4.3. Servicios auxiliares</span><span class="toc-dots"></span><span class="toc-page">10</span></li>

  <li class="toc-item l1"><span>5. Backend Express (server/)</span><span class="toc-dots"></span><span class="toc-page">11</span></li>
  <li class="toc-item l2"><span>5.1. Endpoints REST</span><span class="toc-dots"></span><span class="toc-page">11</span></li>
  <li class="toc-item l2"><span>5.2. Capa de persistencia (db.ts)</span><span class="toc-dots"></span><span class="toc-page">12</span></li>
  <li class="toc-item l2"><span>5.3. Servicios auxiliares del servidor</span><span class="toc-dots"></span><span class="toc-page">12</span></li>

  <li class="toc-item l1"><span>6. Cloud Functions e IA</span><span class="toc-dots"></span><span class="toc-page">13</span></li>
  <li class="toc-item l2"><span>6.1. enrichVocabularyWithAi</span><span class="toc-dots"></span><span class="toc-page">13</span></li>
  <li class="toc-item l2"><span>6.2. deleteUserAccount</span><span class="toc-dots"></span><span class="toc-page">13</span></li>
  <li class="toc-item l2"><span>6.3. Gestión de secretos</span><span class="toc-dots"></span><span class="toc-page">13</span></li>

  <li class="toc-item l1"><span>7. Modelo de Datos y Persistencia</span><span class="toc-dots"></span><span class="toc-page">14</span></li>
  <li class="toc-item l2"><span>7.1. Colecciones Firestore</span><span class="toc-dots"></span><span class="toc-page">14</span></li>
  <li class="toc-item l2"><span>7.2. Almacenamiento local</span><span class="toc-dots"></span><span class="toc-page">15</span></li>
  <li class="toc-item l2"><span>7.3. Formatos de intercambio</span><span class="toc-dots"></span><span class="toc-page">15</span></li>

  <li class="toc-item l1"><span>8. Seguridad</span><span class="toc-dots"></span><span class="toc-page">16</span></li>
  <li class="toc-item l2"><span>8.1. Firestore Security Rules</span><span class="toc-dots"></span><span class="toc-page">16</span></li>
  <li class="toc-item l2"><span>8.2. Autenticación y App Check</span><span class="toc-dots"></span><span class="toc-page">16</span></li>
  <li class="toc-item l2"><span>8.3. Superficie de variables de entorno</span><span class="toc-dots"></span><span class="toc-page">17</span></li>

  <li class="toc-item l1"><span>9. Despliegue e Infraestructura</span><span class="toc-dots"></span><span class="toc-page">18</span></li>
  <li class="toc-item l2"><span>9.1. Canales de publicación</span><span class="toc-dots"></span><span class="toc-page">18</span></li>
  <li class="toc-item l2"><span>9.2. CI/CD</span><span class="toc-dots"></span><span class="toc-page">18</span></li>

  <li class="toc-item l1"><span>10. Rendimiento, Calidad y Riesgos</span><span class="toc-dots"></span><span class="toc-page">19</span></li>
</ul>

<!-- ===================== 1. RESUMEN ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">1. Resumen Ejecutivo</span></div>
<h1><span class="num">1</span> Resumen Ejecutivo</h1>

<p><strong>PronounceIt</strong> es una plataforma de aprendizaje de vocabulario y pronunciación en inglés, dirigida a hispanohablantes, que combina un gestor de diccionario personal con enriquecimiento automático por IA, práctica activa mediante flashcards y tests, y analítica de progreso. El sistema se implementa como un monorepo <code>npm workspaces</code> con tres unidades de despliegue independientes: una aplicación universal <strong>React Native + Expo</strong> (Android APK y PWA web), un backend <strong>Node.js + Express</strong> de tipo API REST y un conjunto de <strong>Firebase Cloud Functions v2</strong> que ejecuta la lógica de IA en un entorno aislado y privilegiado.</p>

<h2>1.1. Objetivos de diseño</h2>
<table>
  <thead><tr><th style="width:28%">Objetivo</th><th style="width:40%">Decisión arquitectónica</th><th style="width:32%">Resultado</th></tr></thead>
  <tbody>
    <tr><td><strong>Disponibilidad sin red</strong></td><td>Persistencia local prioritaria (IndexedDB / AsyncStorage) con reconciliación posterior</td><td>Estudio completo offline; la nube es una mejora, no un requisito</td></tr>
    <tr><td><strong>Multicanal</strong></td><td>Un único árbol de componentes React Native exportado a web y Android</td><td>Paridad funcional APK ↔ PWA sin duplicar lógica de negocio</td></tr>
    <tr><td><strong>Aislamiento de secretos</strong></td><td>La clave de Gemini reside en Secret Manager y solo se resuelve dentro de la Function</td><td>Ninguna credencial privada alcanza el bundle del cliente</td></tr>
    <tr><td><strong>Aislamiento de datos</strong></td><td>Reglas Firestore con denegación por defecto y verificaci&oacute;n de propietario</td><td>Un usuario no puede leer ni escribir datos de otro</td></tr>
    <tr><td><strong>Escalabilidad de costes</strong></td><td>Backend Express en SQLite/JSON plano como alternativa ligera a functionsalways-on</td><td>Despliegue self-hosted en Docker sin coste de plataforma serverless</td></tr>
    <tr><td><strong>Continuidad operativa</strong></td><td>Respaldo de base de datos por fichero versionable + exportaciones JSON/CSV</td><td>Recuperación ante formateo, migración de dispositivo o pérdida de cuenta</td></tr>
  </tbody>
</table>

<h2>1.2. Restricciones técnicas asumidas</h2>
<ul>
  <li><strong>Entorno de ejecución:</strong> Node.js LTS en servidor; navegadores modernos (Chrome 90+, Edge 90+, Firefox 88+, Safari 14+) y Android 8.0 (API 26) o superior en el cliente.</li>
  <li><strong>Idiomas:</strong> TypeScript estricto en cliente, servidor y functions; la lógica de negocio nunca depende de atributos específicos de plataforma.</li>
  <li><strong>Coste de inferencia:</strong> las llamadas a Gemini se limitan a operaciones de escritura (alta de palabra); la lectura de pronunciación se resuelve con un diccionario local y, en segundo término, con una API pública sin coste.</li>
  <li><strong>Latencia objetivo:</strong> menos de 2 s para el autocompletado IA en el 95 % de las peticiones; menos de 100 ms para las operaciones locales de vocabulario.</li>
</ul>

<div class="callout co-info">
  <div class="ic">🧭</div>
  <div class="ct">
    <strong>Principio rector: Local-First con Sincronización Opcional</strong>
    Toda interacción del usuario se resuelve primero contra el almacenamiento local y se propaga de forma asíncrona a la nube. El sistema nunca bloquea la interfaz esperando una respuesta de red, y ninguna indisponibilidad remota degrada la capacidad de estudo.
  </div>
</div>

<!-- ===================== 2. ARQUITECTURA ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">2. Arquitectura del Sistema</span></div>
<h1><span class="num">2</span> Arquitectura del Sistema</h1>

<h2>2.1. Vista de Capas</h2>
<div class="mock">
  <div class="mock-h">
    <div class="mock-dots"><div class="mock-dot"></div><div class="mock-dot"></div><div class="mock-dot"></div></div>
    <span>Diagrama de Capas — Cliente Universal</span>
    <span>Expo / React Native</span>
  </div>
<pre>+--------------------------------------------------------------------------------+
|  CAPA DE PRESENTACION        src/components/**                                |
|  App.tsx · LoginView · VocabularyTableView · FlashcardPracticeView           |
|  TestView · IrregularVerbsTestView · StatsDashboardView · SettingsView       |
+--------------------------------------------------------------------------------+
|  CAPA DE ESTADO / SERVIOS     src/lib/**                                      |
|  firebaseClient · vocabularyStore · apiClient · functionsService             |
|  dictionaryService · csvService · testHistoryStore · networkService          |
|  cefrLevel · categoryUtils · storage · appCheckService · useResponsive        |
+--------------------------------------------------------------------------------+
|  CAPA DE PERSISTENCIA LOCAL  AsyncStorage (RN) | localStorage + IndexedDB (Web)|
+--------------------------------------------------------------------------------+
            |                              |                              |
            v                              v                              v
+---------------------+      +---------------------------+     +-------------------+
|  FIREBASE (nube)    |      |  EXPRESS API (server/)    |     |  GEMINI 2.5 FLASH |
|  Auth · Firestore   |      |  /auth /words /tests       |     |  via Function      |
|  onSnapshot realtime |      |  /discord /updates         |     |  Secret Manager    |
+---------------------+      +---------------------------+     +-------------------+
            |                              |
            v                              v
+--------------------------------------------------------------------------------+
|  PERSISTENCIA SECUNDARIA   db.json (file store con cola de escritura)        |
|  Users · Words · Tests · DiscordRooms · DeletedUsers · AppMeta                |
+--------------------------------------------------------------------------------+</pre>
</div>

<h2>2.2. Monorepo y Estructura de Directorios</h2>
<p>El repositorio se organiza como un monorepo con <code>npm workspaces</code> (<code>client</code> y <code>server</code>), lo que permite una instalación única de dependencias y un versionado coherente entre paquetes.</p>

<div class="tree">PronounceIt/
├── <span class="c"># Raíz del monorepo</span>
├── package.json              <span class="c">workspaces: [client, server]</span>
├── tsconfig.json             <span class="c">configuración TS compartida</span>
├── firebase.json             <span class="c">deploy de functions/ + firestore.rules</span>
├── firestore.rules           <span class="c">políticas de acceso a datos</span>
├── vercel.json               <span class="c">build web SPA + rewrites /apk</span>
├── render.yaml               <span class="c">despliegue backend en Render</span>
├── docker-compose.yml        <span class="c">orquestación self-hosted</span>
├── metadata.json             <span class="c">metadatos del proyecto</span>
├── <span class="d">client/</span>                      <span class="c">app universal React Native + Expo</span>
│   ├── package.json          <span class="f">pronounceit-mobile v1.7.1</span>
│   ├── app.json              <span class="c">config Expo (package, splash, PWA)</span>
│   ├── eas.json              <span class="c">config EAS / builds nativos</span>
│   ├── Dockerfile            <span class="c">build de imagen web</span>
│   ├── assets/               <span class="c">icon, splash, favicon, hero, marcas</span>
│   ├── android/              <span class="c">proyecto nativo generado por Expo</span>
│   ├── public/               <span class="c">estáticos servidos por Vite</span>
│   ├── scripts/              <span class="c">build-icons.js</span>
│   └── <span class="d">src/</span>
│       ├── App.tsx           <span class="c">raíz: auth, tabs, tema, modales</span>
│       ├── theme.ts          <span class="c">tokens de diseño (colores, radios)</span>
│       ├── types/index.ts    <span class="c">contratos TypeScript compartidos</span>
│       ├── components/
│       │   ├── auth/         <span class="c">LoginView</span>
│       │   ├── common/       <span class="c">modales, logo, flags, error boundary</span>
│       │   └── workspace/    <span class="c">12 vistas de producto</span>
│       ├── data/             <span class="c">irregularVerbs.ts (dataset estático)</span>
│       ├── lib/              <span class="c">13 servicios de dominio</span>
│       └── router/           <span class="c">router SPA ligero (Link, routes)</span>
├── <span class="d">server/</span>                     <span class="c">API REST Node + Express</span>
│   ├── package.json          <span class="c">express, bcrypt, jsonwebtoken, nodemailer</span>
│   ├── Dockerfile
│   ├── data/db.json          <span class="c">base de datos de fichero</span>
│   ├── scripts/              <span class="c">notifyUpdate · sendUsersPdf/Excel · sendBajasPdf</span>
│   └── src/
│       ├── index.ts           <span class="c">bootstrap de la app</span>
│       ├── db.ts              <span class="c">capa de persistencia + cola de escritura</span>
│       ├── discordBot.ts      <span class="c">bot de salas de voz temporales</span>
│       ├── middleware/auth.ts <span class="c">JWT middleware</span>
│       ├── routes/            <span class="c">auth · words · tests · discord · updates</span>
│       └── services/          <span class="c">email · excelReport · pdfReport · monthlyScheduler</span>
├── <span class="d">functions/</span>                  <span class="c">Firebase Cloud Functions v2</span>
│   └── src/index.ts           <span class="c">enrichVocabularyWithAi · deleteUserAccount</span>
└── <span class="d">api/</span>                       <span class="c">adaptador serverless para Vercel</span>
    └── [...all].ts           <span class="c">puente Express → funciones Vercel</span></div>

<h2>2.3. Modelo de dominio</h2>
<p>Los contratos de datos se definen centralizadamente en <code>client/src/types/index.ts</code> y son compartidos por todas las capas. La entidad <code>WordItem</code> es el agregado central del dominio:</p>

<div class="tree"><span class="f">WordItem</span>
├── word            <span class="c">string</span>   <span class="c">término en inglés (clave lógica)</span>
├── phoneticIpa     <span class="c">string</span>   <span class="c">transcripción IPA</span>
├── phoneticGuide   <span class="c">string</span>   <span class="c">pronunciación figurada adaptada</span>
├── translation     <span class="c">string</span>   <span class="c">equivalente en español</span>
├── partOfSpeech    <span class="c">enum</span>     <span class="c">sustantivo | verbo | adjetivo | adverbio | modismo</span>
├── cefrLevel       <span class="c">A1…C2</span>    <span class="c">nivel MCER estimado</span>
├── exampleEn/Es    <span class="c">string</span>   <span class="c">oración de ejemplo bilingüe</span>
├── tips            <span class="c">string[]</span> <span class="c">consejos fonéticos para hispanohablantes</span>
├── status          <span class="c">new|review|mastered</span>
├── categoryIds     <span class="c">string[]</span> <span class="c">categorías (relación N:M)</span>
├── isFavorite      <span class="c">boolean</span>
├── nextReviewAt    <span class="c">timestamp</span> <span class="c">programación de repaso (SRS)</span>
└── createdAt / updatedAt</div>

<div class="callout co-tip">
  <div class="ic">🔗</div>
  <div class="ct">
    <strong>Relaciones</strong>
    <code>UserProfile</code> 1—N <code>WordItem</code> · <code>CategoryItem</code> 1—N <code>WordItem</code> (N:M real) · <code>WordItem</code> 1—N <code>TestResult</code> · <code>TestResult</code> N—1 <code>UserProfile</code>. El modelo de categorías admite jerarquía mediante <code>parentId</code>, y <code>SUPPORTED_LANGUAGES</code> define 10 tableros de destino (es, en, fr, de, pt, it, ja, zh, ko, ar).
  </div>
</div>

<!-- ===================== 3. STACK ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">3. Pila Tecnológica</span></div>
<h1><span class="num">3</span> Pila Tecnológica</h1>

<h2>3.1. Runtime de cliente</h2>
<table>
  <thead><tr><th style="width:24%">Tecnología</th><th style="width:16%">Versión</th><th style="width:32%">Papel en el sistema</th><th style="width:28%">Justificación</th></tr></thead>
  <tbody>
    <tr><td><strong>Expo SDK</strong></td><td>~57</td><td>Toolchain, build web y APK</td><td>Unifica iOS/Android/Web con una sola base de código</td></tr>
    <tr><td><strong>React Native</strong></td><td>0.86.3</td><td>Runtime de componentes</td><td>Renderizado nativo con rendimiento de 60 FPS</td></tr>
    <tr><td><strong>React</strong></td><td>19</td><td>Modelo de componentes y hooks</td><td>Ecosistema y compatibilidad con librerías Firebase</td></tr>
    <tr><td><strong>TypeScript</strong></td><td>5.x</td><td>Tipado estático</td><td>Detección de errores de contrato en tiempo de compilación</td></tr>
    <tr><td><strong>Firebase JS SDK</strong></td><td>^12</td><td>Auth, Firestore, App Check</td><td>Backend gestionado, sincronización realtime y reglas de acceso</td></tr>
    <tr><td><strong>expo-speech</strong></td><td>SDK 57</td><td>Síntesis de voz (TTS)</td><td>Motor nativo en Android, <code>speechSynthesis</code> en web</td></tr>
    <tr><td><strong>lucide-react-native</strong></td><td>actual</td><td>Iconografía</td><td>Conjunto consistente y tree-shakeable</td></tr>
    <tr><td><strong>Vite</strong></td><td>actual</td><td>Bundler web (export Expo)</td><td>Arranque y HMR muy rápidos en el pipeline web</td></tr>
  </tbody>
</table>

<h2>3.2. Servicios de backend</h2>
<table>
  <thead><tr><th style="width:24%">Tecnología</th><th style="width:16%">Ámbito</th><th style="width:60%">Uso</th></tr></thead>
  <tbody>
    <tr><td><strong>Node.js + Express</strong></td><td>server/</td><td>API REST: autenticación alternative, CRUD de palabras, historial de tests, salas de Discord, difusión de versiones</td></tr>
    <tr><td><strong>bcrypt</strong></td><td>server/</td><td>Hash de contraseñas con migración automática desde texto plano heredado</td></tr>
    <tr><td><strong>jsonwebtoken</strong></td><td>server/</td><td>Emisión y verificación de JWT en el middleware <code>auth.ts</code></td></tr>
    <tr><td><strong>Nodemailer (SMTP Strato)</strong></td><td>server/</td><td>Correos transaccionales y difusión de actualizaciones con plantillas HTML</td></tr>
    <tr><td><strong>Discord.js</strong></td><td>server/</td><td>Bot que crea salas de voz temporales por idioma con banderas y limpieza automática</td></tr>
    <tr><td><strong>node-cron</strong></td><td>server/</td><td>Planificador mensual que emite informes PDF/Excel al administrador</td></tr>
    <tr><td><strong>Firebase Functions v2</strong></td><td>functions/</td><td>Funciones <code>onCall</code> con acceso privilegiado a Firestore y Auth</td></tr>
    <tr><td><strong>Secret Manager</strong></td><td>GCP</td><td>Alojamiento de <code>GEMINI_API_KEY</code>; el valor solo se resuelve en tiempo de ejecución</td></tr>
  </tbody>
</table>

<h2>3.3. Servicios de terceros</h2>
<div class="grid3">
  <div class="card">
    <div class="card-h"><span style="color:#e62e4c">🤖</span> Gemini 2.5 Flash</div>
    <p>Generación de IPA, traducción, categoría gramatical, nivel CEFR, ejemplos bilingües y consejos de pronunciación. Se invoca desde la Function, nunca desde el cliente.</p>
  </div>
  <div class="card">
    <div class="card-h"><span style="color:#06b6d4">📖</span> Free Dictionary API</div>
    <p>Respaldo público para obtener fonética de términos ausentes del diccionario local, sin coste ni clave. Invocado bajo demanda y con degradación silenciosa.</p>
  </div>
  <div class="card">
    <div class="card-h"><span style="color:#9333ea">🗣️</span> Web Speech / Android TTS</div>
    <p>Reproducción de audio con priorización de voces <code>en-US</code> y <code>en-GB</code>, y control de velocidad configurable (0.75x–1.0x).</p>
  </div>
</div>

<div class="callout co-ai">
  <div class="ic">⚡</div>
  <div class="ct">
    <strong>Decisión clave: por qué la IA no vive en el cliente</strong>
    Llamar a Gemini desde el cliente obligaría a incrustar una clave API en el bundle descargable. La intermediación por Cloud Functions mantiene la clave en Secret Manager, permite revocarla sin redistribución, centraliza la cuota y añade el control de cuota y auditoría propios de App Check y del middleware de autenticación.
  </div>
</div>

<!-- ===================== 4. CAPA DE SERVICIOS ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">4. Capa de Servicios del Cliente</span></div>
<h1><span class="num">4</span> Capa de Servicios del Cliente</h1>

<p>El cliente no contiene lógica de negocio en los componentes. Toda la lógica reside en <code>src/lib/</code>, en servicios sin dependencia de renderizado, lo que garantiza portabilidad entre web y nativo y testabilidad unitaria.</p>

<h2>4.1. firebaseClient.ts</h2>
<p>Servicio central de autenticación y nube (<em>≈2.262 líneas</em>). Es responsable de:</p>
<ul>
  <li><strong>Inicialización</strong> del SDK con la configuración pública del proyecto y soporte de <code>signInAnonymously</code> para el modo local.</li>
  <li><strong>Login en 3 niveles</strong>: consulta en Firestore → caché local del dispositivo → backend Express. Ante fallo de los anteriores, se conserva la caché, garantizando entrada sin red.</li>
  <li><strong>Registro, cambio y restablecimiento de contraseña</strong>, con reautenticación y notificación por correo.</li>
  <li><strong>Perfil y avatar</strong>: persistencia dual en <code>localStorage</code> e IndexedDB para evitar el parpadeo en el re-render.</li>
  <li><strong>Gestión multilingüe</strong>: conmutación del tablero activo entre los 10 idiomas soportados.</li>
  <li><strong>Suscripciones realtime</strong> mediante <code>onSnapshot</code> sobre las subcolecciones del usuario.</li>
  <li><strong>Modo offline</strong> con cola de operaciones pendientes y reintento exponencial.</li>
</ul>

<h2>4.2. vocabularyStore.ts</h2>
<p>Motor de dominio del vocabulario (<em>≈1.024 líneas</em>). Responsabilidades:</p>
<ul>
  <li>CRUD completo de palabras con <strong>sincronización dual</strong> (Firestore + backend Express) y resolución de conflictos por marca de tiempo.</li>
  <li>Programación de repasos mediante <strong>SRS</strong> (sistema de repetición espaciada) sobre el campo <code>nextReviewAt</code>.</li>
  <li><strong>Reclasificación CEFR</strong> de palabras heredadas al migrar el modelo de datos.</li>
  <li>Emisión de audio mediante <code>expo-speech</code> con caché de voces y respeto de la velocidad configurada.</li>
  <li>Tableros independientes por <strong>idioma de destino</strong>.</li>
</ul>

<h2>4.3. Servicios auxiliares</h2>
<table>
  <thead><tr><th style="width:30%">Módulo</th><th style="width:70%">Responsabilidad</th></tr></thead>
  <tbody>
    <tr><td><code>apiClient.ts</code></td><td>Cliente HTTP con cabeceras, tiempo de espera, reintento y normalización de errores hacia el backend Express</td></tr>
    <tr><td><code>functionsService.ts</code></td><td>Invocación de callable functions (<code>httpsCallable</code>) con tipado de payloads</td></tr>
    <tr><td><code>dictionaryService.ts</code></td><td>Diccionario fonético local de alta frecuencia con degradación hacia la Free Dictionary API y estimación de nivel CEFR</td></tr>
    <tr><td><code>cefrLevel.ts</code></td><td>Algoritmo de estimación de nivel MCER a partir de longitud, complejidad morfológica y frecuencia del término</td></tr>
    <tr><td><code>csvService.ts</code></td><td>Serialización y parseo CSV con escape de comillas y soporte UTF-8 con BOM</td></tr>
    <tr><td><code>testHistoryStore.ts</code></td><td>Estado del historial de pruebas y sincronización con la nube</td></tr>
    <tr><td><code>networkService.ts</code></td><td>Detección de conectividad y switching automático entre modo online y offline</td></tr>
    <tr><td><code>storage.ts</code></td><td>Abstracción de almacenamiento: <code>AsyncStorage</code> en RN, <code>localStorage</code> en web</td></tr>
    <tr><td><code>appCheckService.ts</code></td><td>Registro y verificación de Firebase App Check (Play Integrity / App Attest)</td></tr>
    <tr><td><code>categoryUtils.ts</code></td><td>Normalización, jerarquía y estadísticas de categorías</td></tr>
    <tr><td><code>useResponsive.ts</code></td><td>Hook de layout responsivo que decide entre barra lateral y bottom bar</td></tr>
    <tr><td><code>irregularVerbs.ts</code></td><td>Dataset estático de verbos irregulares en inglés con fonética IPA, clasificados por nivel</td></tr>
  </tbody>
</table>

<!-- ===================== 5. BACKEND ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">5. Backend Express</span></div>
<h1><span class="num">5</span> Backend Express (server/)</h1>

<p>El servidor Express opera como <strong>API REST y plano complementario</strong> a Firebase. Se concentra en los casos en que un backend convencional aporta ventaja: generación de informes, envío masivo de correos, integración con Discord y persistencia ligera para despliegue self-hosted.</p>

<h2>5.1. Endpoints REST</h2>
<table>
  <thead><tr><th style="width:22%">Ruta</th><th style="width:16%">Método</th><th style="width:28%">Función</th><th style="width:34%">Notas</th></tr></thead>
  <tbody>
    <tr><td><code>/api/auth/register</code></td><td>POST</td><td>Alta de usuario</td><td>Hash bcrypt + correo de bienvenida</td></tr>
    <tr><td><code>/api/auth/login</code></td><td>POST</td><td>Inicio de sesión</td><td>Migración automática de hash en plaintext heredado</td></tr>
    <tr><td><code>/api/auth/change-password</code></td><td>POST</td><td>Cambio de credencial</td><td>Exige JWT válido</td></tr>
    <tr><td><code>/api/auth/reset-password</code></td><td>POST</td><td>Restablecimiento</td><td>Token temporal + correo transaccional</td></tr>
    <tr><td><code>/api/auth/profile</code></td><td>PUT</td><td>Actualización de perfil</td><td>Campos saneados en servidor</td></tr>
    <tr><td><code>/api/auth/delete-account</code></td><td>DELETE</td><td>Baja de cuenta</td><td>Borrado en cascada + registro en <code>deletedUsers</code></td></tr>
    <tr><td><code>/api/words</code></td><td>GET/POST/PUT/DELETE</td><td>CRUD de vocabulario</td><td>Aislado por <code>userId</code> del token</td></tr>
    <tr><td><code>/api/tests</code></td><td>GET/POST</td><td>Historial de pruebas</td><td>Persistencia de resultados y métricas</td></tr>
    <tr><td><code>/api/discord/rooms</code></td><td>POST</td><td>Creación de sala de voz</td><td>Salas temporales de 1 h, con bandera por idioma</td></tr>
    <tr><td><code>/api/updates/broadcast</code></td><td>POST</td><td>Difusión de versión</td><td>Requiere rol de administrador</td></tr>
  </tbody>
</table>

<h2>5.2. Capa de persistencia (db.ts)</h2>
<p>Base de datos sobre fichero JSON con <strong>cola de escritura serializada</strong>, que previene condiciones de carrera en las operaciones concurrentes:</p>
<div class="grid2">
  <div class="card">
    <div class="card-h"><span style="color:#e62e4c">🗄️</span> Tablas</div>
    <p><code>users</code> · <code>words</code> · <code>tests</code> · <code>discordRooms</code> · <code>deletedUsers</code> · <code>appMeta</code></p>
  </div>
  <div class="card">
    <div class="card-h"><span style="color:#f59e0b">⚙️</span> Comportamiento</div>
    <p>Lecturas síncronas en memoria; escrituras encoladas y confirmadas con <code>await</code>. En entorno serverless la ruta se redirige a <code>/tmp/data</code> por la natureza efímera del filesystem.</p>
  </div>
</div>

<h2>5.3. Servicios auxiliares del servidor</h2>
<ul>
  <li><strong>emailService.ts</strong> — plantillas HTML con tema oscuro: bienvenida, confirmación de cambio de contraseña, confirmación de baja y difusión de nueva versión a todos los usuarios registrados.</li>
  <li><strong>pdfReportService.ts</strong> / <strong>excelReportService.ts</strong> — informes de actividad por usuario (volumen de vocabulario, tasa de dominio, racha, resultados de tests).</li>
  <li><strong>monthlyScheduler.ts</strong> — tarea cron ejecutada el día 1 de cada mes, que genera y envía los informes al administrador.</li>
  <li><strong>discordBot.ts</strong> — bot que crea salas de voz efímeras por idioma, con bandera correspondiente y limpieza automática al expirar.</li>
  <li><strong>notifyUpdate.ts</strong> — script de línea de comandos para emitir avisos de nueva versión.</li>
</ul>

<!-- ===================== 6. FUNCTIONS ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">6. Cloud Functions e IA</span></div>
<h1><span class="num">6</span> Cloud Functions e Inteligencia Artificial</h1>

<p>Las Cloud Functions v2 constituyen el <strong>único componente con privilegios elevados</strong> del sistema. Se despliegan en la región <code>us-central1</code> y se invocan mediante el protocolo <em>callable</em> de Firebase, que transmite el token de autenticación del cliente de forma verificable.</p>

<h2>6.1. enrichVocabularyWithAi</h2>
<p>Función principal de valor de producto. Configuración declarada en el propio código:</p>
<table>
  <thead><tr><th style="width:30%">Parámetro</th><th style="width:30%">Valor</th><th style="width:40%">Motivación</th></tr></thead>
  <tbody>
    <tr><td><code>region</code></td><td><code>us-central1</code></td><td>Coherencia con la región del proyecto y menor latencia de invocación</td></tr>
    <tr><td><code>secrets</code></td><td><code>[geminiApiKey]</code></td><td>Inyección bajo demanda; la clave no reside en el repositorio</td></tr>
    <tr><td><code>timeoutSeconds</code></td><td>30</td><td>Margen suficiente para la latencia del modelo con degradación controlada</td></tr>
    <tr><td><code>memory</code></td><td>256 MiB</td><td>Suficiente para el payload; evita sobrecoste por sobreaprovisionamiento</td></tr>
    <tr><td><code>temperature</code></td><td>0.2</td><td>Salida determinista: la fonética es un dato, no una tarea creativa</td></tr>
    <tr><td><code>responseMimeType</code></td><td><code>application/json</code></td><td>Respuesta estrictamente parseable, sin bloques markdown</td></tr>
    <tr><td><code>enforceAppCheck</code></td><td><code>false</code></td><td>Se activa tras registrar Play Integrity / App Attest</td></tr>
  </tbody>
</table>

<h4>Pipeline de validación</h4>
<div class="steps">
  <div class="step"><div class="step-n">1</div><div class="step-b"><div class="step-t">Autenticación estricta</div><div class="step-d">Si falta <code>request.auth</code> se lanza <code>HttpsError('unauthenticated')</code> y se registra el intento con la IP de origen en los logs de Cloud Logging.</div></div></div>
  <div class="step"><div class="step-n">2</div><div class="step-b"><div class="step-t">Validación y saneamiento de la entrada</div><div class="step-d">El término se recorta a 80 caracteres máximos. Se rechaza cualquier valor que no sea cadena no vacía.</div></div></div>
  <div class="step"><div class="step-n">3</div><div class="step-b"><div class="step-t">Resolución del secreto</div><div class="step-d"><code>geminiApiKey.value()</code> se invoca en tiempo de ejecución. Si no está disponible, se devuelve <code>failed-precondition</code> sin revelar detalles de configuración.</div></div></div>
  <div class="step"><div class="step-n">4</div><div class="step-b"><div class="step-t">Invocación del modelo</div><div class="step-d">Petición REST a <code>gemini-2.5-flash</code> con <em>prompt</em> de rol Lingüista y esquema JSON estricto de ocho campos.</div></div></div>
  <div class="step"><div class="step-n">5</div><div class="step-b"><div class="step-t">Normalización de la respuesta</div><div class="step-d">Cada campo se sanea con valor por defecto; <code>pronunciationTips</code> se valida como array y <code>difficulty</code> se acota al rango CEFR válido.</div></div></div>
  <div class="step"><div class="step-n">6</div><div class="step-b"><div class="step-t">Mapeo de errores</div><div class="step-d">HTTP 429 se traduce a <code>resource-exhausted</code> con mensaje orientado al usuario; cualquier otro fallo se colapsa a <code>internal</code> sin filtrar detalle interno.</div></div></div>
</div>

<div class="callout co-warn">
  <div class="ic">🔐</div>
  <div class="ct">
    <strong>Nota de seguridad sobre la clave del modelo</strong>
    El prompt se construye por interpolación de cadena con el término del usuario. La validación previa (<code>trim</code>, longitud máxima, comprobación de tipo) mitiga el riesgo de inyección de instrucciones, y el <code>temperature</code> bajo y el <code>responseMimeType</code> JSON limitan el alcance del contenido generado. Como refuerzo, el resultado se parsea con <code>JSON.parse</code> y se normaliza campo a campo antes de devolverlo.
  </div>
</div>

<h2>6.2. deleteUserAccount</h2>
<p>Función administrativa que elimina la cuenta de forma exhaustiva y verificable:</p>
<ol>
  <li>Enumeración de subcolecciones del documento de usuario en <code>users/{uid}</code>.</li>
  <li>Borrado por lotes (<code>batch</code>) de todos los documentos de cada subcolección, evitando el límite de 500 escrituras por lote.</li>
  <li>Eliminación del documento de perfil.</li>
  <li>Borrado de la cuenta en Firebase Auth mediante el Admin SDK.</li>
</ol>
<p>Requiere confirmación explícita del cliente (<code>confirmation</code>) y devuelve un descriptor del UID eliminado. El registro de la baja se conserva en <code>deletedUsers</code> en el backend Express para los informes administrativos.</p>

<h2>6.3. Gestión de secretos</h2>
<div class="tree"><span class="c"># Secret Manager (GCP)</span>
├── <span class="d">GEMINI_API_KEY</span>            <span class="c">→ defineSecret('GEMINI_API_KEY')</span>
│   <span class="c">Acceso: solo dentro de enrichVocabularyWithAi</span>
│
<span class="c"># Secretos del backend Express (server/.env)</span>
├── <span class="d">JWT_SECRET</span>              <span class="c">→ firma y verificación de tokens</span>
├── <span class="d">SMTP_HOST / SMTP_PORT</span>   <span class="c">→ servidor de correo saliente</span>
├── <span class="d">SMTP_USER / SMTP_PASS</span>   <span class="c">→ credenciales de correo</span>
├── <span class="d">DISCORD_TOKEN</span>           <span class="c">→ sesión del bot de Discord</span>
└── <span class="d">ADMIN_EMAIL</span>             <span class="c">→ destinatario de los informes</span></div>

<!-- ===================== 7. DATOS ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">7. Modelo de Datos</span></div>
<h1><span class="num">7</span> Modelo de Datos y Persistencia</h1>

<h2>7.1. Colecciones Firestore</h2>
<table>
  <thead><tr><th style="width:26%">Ruta</th><th style="width:14%">Acceso</th><th style="width:60%">Contenido</th></tr></thead>
  <tbody>
    <tr><td><code>users/{uid}</code></td><td>Propietario</td><td>Perfil: nombre, alias, avatar, idioma activo, preferencias de tema y velocidad de TTS, fecha de alta</td></tr>
    <tr><td><code>users/{uid}/words/{id}</code></td><td>Propietario</td><td>Palabras del usuario con todos los campos de <code>WordItem</code> más SRS y marcas de tiempo</td></tr>
    <tr><td><code>users/{uid}/categories/{id}</code></td><td>Propietario</td><td>Categorías: nombre, icono, color, <code>parentId</code> para jerarquía</td></tr>
    <tr><td><code>users/{uid}/test_history/{id}</code></td><td>Propietario</td><td>Resultados: tipo de test, puntuación, percentage, desglose de respuestas y fecha</td></tr>
    <tr><td><code>words/{id}</code></td><td>Lectura auth.</td><td>Catálogo global de vocabulario — solo lectura desde el cliente; escritura exclusiva por Admin SDK</td></tr>
    <tr><td><code>test_history/{id}</code></td><td>Propietario</td><td>Historial global con verificación de <code>userId</code> en cada operación</td></tr>
    <tr><td><code>accounts/{id}</code></td><td>Bloqueado</td><td>Colección interna protegida: ninguna lectura ni escritura desde el cliente</td></tr>
  </tbody>
</table>

<h2>7.2. Almacenamiento local</h2>
<table>
  <thead><tr><th style="width:28%">Plataforma</th><th style="width:28%">Tecnología</th><th style="width:44%">Contenido</th></tr></thead>
  <tbody>
    <tr><td><strong>Android (APK)</strong></td><td>AsyncStorage</td><td>Vocabulario, categorías, historial, preferencias y sesión</td></tr>
    <tr><td><strong>Web</strong></td><td>localStorage</td><td>Preferencias, sesión y caché de credenciales</td></tr>
    <tr><td><strong>Web (avatar)</strong></td><td>IndexedDB</td><td>Imagen de perfil en base64, evitando saturar <code>localStorage</code></td></tr>
  </tbody>
</table>

<div class="callout co-tip">
  <div class="ic">🔄</div>
  <div class="ct">
    <strong>Protocolo de sincronización</strong>
    <em>Escritura:</em> se aplica en local de forma inmediata (respuesta instantánea al usuario) y se propaga a Firestore y al backend en segundo plano. <em>Lectura:</em> en modo online se suscribe a <code>onSnapshot</code> para recibir actualizaciones en tiempo real; en modo offline se sirve desde la caché local. <em>Resolución de conflictos:</em> prevalece la marca de tiempo más reciente, con el estado de revisión como criterio de desempate.
  </div>
</div>

<h2>7.3. Formatos de intercambio</h2>
<div class="grid2">
  <div class="card">
    <div class="card-h"><span style="color:#e62e4c">📥</span> JSON — Formato canónico</div>
    <p>Volcado completo e idempotente del estado del usuario: palabras, categorías, historial, preferencias. Es el formato de respaldo y restauración de referencia, y el que permite migrar entre dispositivos.</p>
  </div>
  <div class="card">
    <div class="card-h"><span style="color:#10b981">📊</span> CSV — Interoperabilidad</div>
    <p>Exportación tabular compatible con Excel, Google Sheets y Numbers, con cabecera de columnas y escape de comillas. Pensada para el análisis externo y la impresión de listas de estudio.</p>
  </div>
</div>

<!-- ===================== 8. SEGURIDAD ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">8. Seguridad</span></div>
<h1><span class="num">8</span> Seguridad</h1>

<h2>8.1. Firestore Security Rules</h2>
<p>Las reglas siguen el principio de <strong>menor privilegio con denegación por defecto</strong>: cualquier ruta no declarada de forma explícita queda inaccesible.</p>
<div class="tree"><span class="c">// Denegación global por defecto</span>
match /{document=**} { allow read, write: if false; }

<span class="c">// Aislamiento estricto por UID</span>
match /users/{userId} {
  allow read, update, delete: if isOwner(userId);
  allow create: if isOwner(userId) &amp;&amp; request.resource.data.id == userId;

  match /words/{wordId}          { allow read, write: if isOwner(userId); }
  match /categories/{categoryId}  { allow read, write: if isOwner(userId); }
  match /test_history/{testId}   { allow read, write: if isOwner(userId); }
  match /{allSubcollections=**}   { allow read, write: if isOwner(userId); }
}

<span class="c">// Catálogo global: solo lectura para autenticados</span>
match /words/{wordId} { allow read: if isAuthenticated(); allow write: if false; }

<span class="c">// Cuentas internas: bloqueo total</span>
match /accounts/{docId} { allow read, write: if false; }</div>

<table>
  <thead><tr><th style="width:30%">Vector</th><th style="width:70%">Control aplicado</th></tr></thead>
  <tbody>
    <tr><td><strong>Lectura entre usuarios</strong></td><td>Verificación de <code>request.auth.uid == userId</code> en cada operación sobre <code>users/{userId}</code> y sus subcolecciones</td></tr>
    <tr><td><strong>Escalada de privilegios</strong></td><td>La creación de perfil exige que <code>resource.data.id</code> coincida con el UID del token</td></tr>
    <tr><td><strong>Modificación del catálogo global</strong></td><td><code>allow write: if false</code>; solo el Admin SDK puede modificarlo</td></tr>
    <tr><td><strong>Exfiltración de credenciales</strong></td><td>La colección <code>accounts</code> es inaccesible desde el cliente</td></tr>
    <tr><td><strong>Robo de sesión</strong></td><td>JWT firmados con <code>JWT_SECRET</code>, con verificación de expiración en el middleware</td></tr>
    <tr><td><strong>Filtración de secretos</strong></td><td>Las variables <code>VITE_*</code> / <code>EXPO_PUBLIC_*</code> son públicas por diseño; toda credencial privada reside en Secret Manager o en el entorno del servidor</td></tr>
    <tr><td><strong>Depredación del cliente</strong></td><td>App Check preparado para activarse con Play Integrity y App Attest</td></tr>
  </tbody>
</table>

<h2>8.2. Autenticación y App Check</h2>
<ul>
  <li><strong>Firebase Authentication</strong> como sistema de identidad, con soporte de correo/contraseña y sesión anónima para el modo local.</li>
  <li><strong>JWT</strong> en el backend Express como mecanismo alternativo e independiente, verificado en <code>middleware/auth.ts</code>.</li>
  <li><strong>Firebase App Check</strong> (<code>appCheckService.ts</code>) preparado para adjuntar tokens de integridad en las invocaciones a Functions; el flag <code>enforceAppCheck</code> se habilita cuando el attestation está registrado.</li>
  <li><strong>Sanitización</strong> de entradas en cliente y servidor: recorte de longitudes, validación de tipos y control de formas de array en las respuestas de la IA.</li>
</ul>

<h2>8.3. Superficie de variables de entorno</h2>
<table>
  <thead><tr><th style="width:32%">Grupo</th><th style="width:30%">Visibilidad</th><th style="width:38%">Ejemplos</th></tr></thead>
  <tbody>
    <tr><td><code>VITE_*</code> / <code>EXPO_PUBLIC_*</code></td><td><strong>Públicas</strong> — en el bundle</td><td><code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_PROJECT_ID</code>, <code>VITE_API_URL</code></td></tr>
    <tr><td><code>server/.env</code></td><td>Privada — solo servidor</td><td><code>JWT_SECRET</code>, <code>SMTP_*</code>, <code>DISCORD_TOKEN</code></td></tr>
    <tr><td>Secret Manager</td><td>Privada — solo Functions</td><td><code>GEMINI_API_KEY</code></td></tr>
  </tbody>
</table>
<div class="callout co-crimson">
  <div class="ic">⛔</div>
  <div class="ct">
    <strong>Invariante del proyecto</strong>
    Ninguna clave privada (API keys, service accounts, secretos SMTP, tokens de Discord) puede aparecer jamás en el directorio <code>client/</code> ni en un fichero con prefijo <code>VITE_</code> o <code>EXPO_PUBLIC_</code>. Cualquier llamada a un servicio de terceros que requiera credencial debe pasar por una Cloud Function o por el backend Express.
  </div>
</div>

<!-- ===================== 9. DESPLIEGUE ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">9. Despliegue e Infraestructura</span></div>
<h1><span class="num">9</span> Despliegue e Infraestructura</h1>

<h2>9.1. Canales de publicación</h2>
<table>
  <thead><tr><th style="width:22%">Canal</th><th style="width:26%">Plataforma</th><th style="width:52%">Configuración</th></tr></thead>
  <tbody>
    <tr><td><strong>PWA</strong></td><td>Vercel</td><td><code>vercel.json</code> sirve <code>client/dist</code> y aplica <em>rewrites</em> de todas las rutas a la SPA. Modo <code>standalone</code> para instalación en pantalla de inicio</td></tr>
    <tr><td><strong>APK Android</strong></td><td>GitHub Releases</td><td>Las rutas <code>/apk</code>, <code>/PronounceIt.apk</code> y equivalentes redirigen al release publicado</td></tr>
    <tr><td><strong>Instalación iOS</strong></td><td>Vercel</td><td>Redirección a <code>/?install=apple</code>, que abre el modal de instructions de «Añadir a pantalla de inicio»</td></tr>
    <tr><td><strong>Backend</strong></td><td>Render / Docker</td><td><code>render.yaml</code> para el servicio Node; <code>docker-compose.yml</code> para el despliegue self-hosted con contenedores de cliente y servidor</td></tr>
    <tr><td><strong>Functions</strong></td><td>Firebase</td><td><code>firebase.json</code> despliega el codebase <code>functions/</code> con las <code>firestore.rules</code> asociadas</td></tr>
    <tr><td><strong>Serverless API</strong></td><td>Vercel</td><td>El adaptador <code>api/[...all].ts</code> expone la aplicación Express como función serverless</td></tr>
  </tbody>
</table>

<h2>9.2. CI/CD</h2>
<p>El workflow <code>.github/workflows/build-apk.yml</code> automatiza la compilación del binario Android:</p>
<div class="steps">
  <div class="step"><div class="step-n">1</div><div class="step-b"><div class="step-t">Disparador</div><div class="step-d">Ejecución por <code>push</code> en la rama de publicación o por <code>workflow_dispatch</code> manual.</div></div></div>
  <div class="step"><div class="step-n">2</div><div class="step-b"><div class="step-t">Preparación del entorno</div><div class="step-d">Instalación de Node LTS, descarga de la toolchain de Expo y restauración de la caché de dependencias.</div></div></div>
  <div class="step"><div class="step-n">3</div><div class="step-b"><div class="step-t">Compilación</div><div class="step-d">Ejecución del <em>prebuild</em> nativo y del <code>assembleRelease</code> de Gradle con la clave de firma configurada como secreto del repositorio.</div></div></div>
  <div class="step"><div class="step-n">4</div><div class="step-b"><div class="step-t">Publicación</div><div class="step-d">Creación del release en GitHub Releases con el artefacto <code>.apk</code> y las notas de la versión extraídas del changelog.</div></div></div>
</div>

<div class="grid3">
  <div class="card"><div class="card-h"><span style="color:#10b981">✅</span> Estado</div><p>Producción y verificado en el canal oficial de GitHub Releases.</p></div>
  <div class="card"><div class="card-h"><span style="color:#f59e0b">🔁</span> Frecuencia</div><p>Publicación por versión, con hotfixes críticos de forma inmediata.</p></div>
  <div class="card"><div class="card-h"><span style="color:#06b6d4">📣</span> Difusión</div><p>La publicación de una versión dispara el envío de correo a todos los usuarios registrados.</p></div>
</div>

<!-- ===================== 10. RIESGOS ===================== -->
<div class="page-break"></div>
<div class="run-head"><span>PronounceIt v${VERSION} &bull; ${AUTHOR}</span><span class="accent">10. Rendimiento y Riesgos</span></div>
<h1><span class="num">10</span> Rendimiento, Calidad y Riesgos</h1>

<h2>10.1. Acciones de rendimiento implementadas</h2>
<ul>
  <li><strong>Lectura local prioritaria</strong> — el vocabulario se resuelve desde la caché antes de cualquier llamada de red.</li>
  <li><strong>Suscripciones realtime</strong> — <code>onSnapshot</code> en lugar de sondeo periódico.</li>
  <li><strong>Diccionario fonético embebido</strong> — evita llamadas de red para términos frecuentes.</li>
  <li><strong>Persistencia del avatar en IndexedDB</strong> — evita el parpadeo de la imagen al re-renderizar.</li>
  <li><strong>Borrado por lotes</strong> — <code>batch</code> de Firestore para operaciones masivas, dentro del límite de 500 escrituras.</li>
  <li><strong>Abort de temporizadores</strong> — <code>timeoutSeconds</code> acotado en las invocaciones de Function para no retener conexiones.</li>
  <li><strong>Code-splitting por ruta</strong> — la exportación web separa los chunks por vista.</li>
</ul>

<h2>10.2. Riesgos técnicos y mitigaciones</h2>
<table>
  <thead><tr><th style="width:26%">Riesgo</th><th style="width:14%">Impacto</th><th style="width:60%">Mitigación implementada</th></tr></thead>
  <tbody>
    <tr><td>Cuota de Gemini agotada (429)</td><td>Alto</td><td>Mapeo a <code>resource-exhausted</code> con mensaje accionable; el diccionario local mantiene la función operativa sin IA</td></tr>
    <tr><td>Filtrado del secreto en el bundle</td><td>Crítico</td><td>Invariante de proyecto: las credenciales solo existen en Secret Manager o en el entorno del servidor</td></tr>
    <tr><td>Conflictos de escritura entre dispositivos</td><td>Medio</td><td>Resolución por marca de tiempo y escritura idempotente; la caché local absorbe el conflicto</td></tr>
    <tr><td>Indisponibilidad de Firebase</td><td>Alto</td><td>Login en 3 niveles y operación offline completa; ninguna función de estudio depende de la nube</td></tr>
    <tr><td>Pérdida del fichero <code>db.json</code></td><td>Alto</td><td>El fichero está versionado; además, la fuente de verdad primaria es Firestore</td></tr>
    <tr><td>Abuso de las funciones por clientes no legítimos</td><td>Medio</td><td>Autenticación obligatoria, flag <code>enforceAppCheck</code> preparado y límite de longitud en la entrada</td></tr>
    <tr><td>Deriva entre modelo cliente y reglas</td><td>Medio</td><td>Regla recursiva <code>match /{allSubcollections=**}</code> que cubre cualquier subcolección futura sin modificarlas</td></tr>
  </tbody>
</table>

<h2>10.3. Hoja de ruta técnica</h2>
<div class="steps">
  <div class="step"><div class="step-n">1</div><div class="step-b"><div class="step-t">Habilitar App Check en producción</div><div class="step-d">Registrar Play Integrity en Android y App Attest en iOS, y activar <code>enforceAppCheck: true</code> en ambas funciones tras verificar el tráfico legítimo.</div></div></div>
  <div class="step"><div class="step-n">2</div><div class="step-b"><div class="step-t">Migración del backend a base de datos relacional</div><div class="step-d">Sustituir el almacén por fichero por SQLite o Postgres cuando el volumen de usuarios y la concurrencia lo justifiquen; la capa <code>db.ts</code> ya encapsula el acceso.</div></div></div>
  <div class="step"><div class="step-n">3</div><div class="step-b"><div class="step-t">Pruebas automatizadas</div><div class="step-d">Suite de pruebas unitarias sobre <code>cefrLevel</code>, <code>csvService</code> y el cálculo de distancia de Levenshtein del corrector de erratas; pruebas de integración sobre las reglas de Firestore con el emulador.</div></div></div>
  <div class="step"><div class="step-n">4</div><div class="step-b"><div class="step-t">Telemetría opt-in y analítica</div><div class="step-d">Métricas agregadas de retención con consentimiento explícito, sin trazas personales, alojadas en un proyecto de BigQuery separado del de producción.</div></div></div>
</div>

<div class="closing">
  <h3>📐 Documento de Ingeniería — PronounceIt v${VERSION}</h3>
  <p>La arquitectura descrita mantiene los principios de aislamiento de secretos, denegación por defecto y operación offline, extensible a nuevos idiomas, nuevas modalidades de evaluación y canales de despliegue adicionales sin modificar el núcleo del dominio.</p>
  <div class="sig">${AUTHOR} &bull; PronounceIt Platform</div>
  <div class="fine">© 2026 ${AUTHOR} &bull; Especificación técnica de uso interno &bull; React Native · Expo · Firebase · Gemini AI</div>
</div>

</body>
</html>
`;

const htmlPath = path.join(rootDir, 'Especificaciones_Tecnicas_PronounceIt.html');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML generado:', htmlPath);

const pdfPath = path.join(rootDir, 'Especificaciones_Tecnicas_PronounceIt.pdf');

// ---------------------------------------------------------------------------
// Servidor HTTP temporal para servir el HTML (evita restricciones file://)
// ---------------------------------------------------------------------------
const http = require('http');
const PORT = 19823;

const server = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('Servidor temporal en http://127.0.0.1:' + PORT);

  const edgeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  const browser = edgeCandidates.find(function (p) { return fs.existsSync(p); });
  if (!browser) {
    console.error('No se encontró Chrome ni Edge.');
    server.close();
    process.exit(1);
  }

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=8000',
    '--no-pdf-header-footer',
    '--print-to-pdf=' + pdfPath,
    'http://127.0.0.1:' + PORT + '/',
  ];

  console.log('Renderizando con:', browser);
  const child = spawn(browser, args, { stdio: 'pipe' });

  let stderr = '';
  child.stderr && child.stderr.on('data', function (d) { stderr += d.toString(); });

  child.on('exit', function (code) {
    server.close();
    if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 1024) {
      const kb = (fs.statSync(pdfPath).size / 1024).toFixed(1);
      console.log('\n✅ PDF generado correctamente.');
      console.log('   Ruta  :', pdfPath);
      console.log('   Tamaño:', kb, 'KB');
    } else {
      console.error('❌ Fallo al generar el PDF (código ' + code + ').');
      if (stderr) console.error(stderr.slice(0, 600));
      process.exit(1);
    }
  });
});
