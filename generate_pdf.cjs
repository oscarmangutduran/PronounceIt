const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Determine root directory
const rootDir = __dirname;
const assetsDir = path.join(rootDir, 'client', 'assets');

// Helper to get base64 data URI of an image
function getImageBase64(filename) {
  try {
    const fullPath = path.join(assetsDir, filename);
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(filename).replace('.', '');
      const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png');
      const base64 = fs.readFileSync(fullPath).toString('base64');
      return `data:${mime};base64,${base64}`;
    }
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
  }
  return '';
}

const iconBase64 = getImageBase64('icon.png') || getImageBase64('splash-icon.png') || getImageBase64('favicon.png');
const heroBase64 = getImageBase64('login_hero.jpg');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>PronounceIt - Manual Oficial de Usuario</title>
  <style>
    /* ==========================================================================
       ESTILOS TIPOGRÁFICOS Y DE PÁGINA (A4 / IMPRESIÓN / PDF)
       ========================================================================== */
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.55;
      font-size: 10pt;
      -webkit-font-smoothing: antialiased;
    }

    /* Page breaks control */
    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Header & Footer en página */
    .doc-running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 20px;
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 600;
    }

    .doc-running-header .app-badge {
      color: #2563eb;
      font-weight: 700;
    }

    /* ==========================================================================
       PORTADA
       ========================================================================== */
    .cover-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 30px 10px 10px 10px;
      page-break-after: always;
      break-after: page;
    }

    .cover-top {
      text-align: center;
      margin-top: 40px;
    }

    .cover-logo-container {
      margin-bottom: 25px;
      display: inline-block;
      padding: 16px;
      background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
      border-radius: 28px;
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.2);
    }

    .cover-logo-img {
      width: 100px;
      height: 100px;
      border-radius: 20px;
      display: block;
      object-fit: cover;
    }

    .cover-title {
      font-size: 38pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -1px;
      line-height: 1.1;
      margin-bottom: 12px;
    }

    .cover-title span {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cover-subtitle {
      font-size: 14pt;
      font-weight: 500;
      color: #475569;
      max-width: 540px;
      margin: 0 auto 28px auto;
      line-height: 1.4;
    }

    .cover-badge-row {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 35px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 8pt;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-purple { background: #ede9fe; color: #5b21b6; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-slate { background: #f1f5f9; color: #334155; }

    .cover-summary-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px 30px;
      max-width: 580px;
      margin: 0 auto;
      text-align: left;
    }

    .cover-summary-card h4 {
      font-size: 11pt;
      color: #0f172a;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cover-summary-card p {
      font-size: 9pt;
      color: #64748b;
      line-height: 1.5;
    }

    .cover-footer {
      border-top: 1.5px solid #e2e8f0;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8.5pt;
      color: #64748b;
    }

    .cover-footer-left strong {
      display: block;
      color: #0f172a;
      font-size: 9.5pt;
      margin-bottom: 4px;
    }

    .cover-footer-right {
      text-align: right;
    }

    /* ==========================================================================
       TABLA DE CONTENIDOS (ÍNDICE)
       ========================================================================== */
    .toc-container {
      margin-top: 10px;
      margin-bottom: 30px;
    }

    .toc-title {
      font-size: 20pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #2563eb;
    }

    .toc-list {
      list-style: none;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px dotted #cbd5e1;
      font-size: 9.5pt;
    }

    .toc-item.level-1 {
      font-weight: 700;
      color: #0f172a;
      padding-top: 12px;
      font-size: 10.5pt;
    }

    .toc-item.level-2 {
      padding-left: 20px;
      color: #334155;
      font-weight: 500;
    }

    .toc-item.level-3 {
      padding-left: 36px;
      color: #64748b;
      font-size: 9pt;
    }

    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted #94a3b8;
      margin: 0 10px;
    }

    .toc-page {
      font-weight: 700;
      color: #2563eb;
    }

    /* ==========================================================================
       ENCABEZADOS Y CONTENIDO GENERAL
       ========================================================================== */
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 28px;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h1 .sec-number {
      background: #2563eb;
      color: #ffffff;
      font-size: 11pt;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 800;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }

    p {
      margin-bottom: 10px;
      color: #334155;
      text-align: justify;
    }

    ul, ol {
      margin-left: 20px;
      margin-bottom: 12px;
      color: #334155;
    }

    li {
      margin-bottom: 5px;
    }

    /* Callouts & Alert Boxes */
    .callout {
      padding: 12px 16px;
      border-radius: 10px;
      margin: 14px 0;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      font-size: 9pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .callout-icon {
      font-size: 14pt;
      line-height: 1;
    }

    .callout-content {
      flex: 1;
    }

    .callout-content strong {
      display: block;
      margin-bottom: 3px;
    }

    .callout-tip {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      color: #166534;
    }
    .callout-tip strong { color: #14532d; }

    .callout-info {
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      color: #1e40af;
    }
    .callout-info strong { color: #1e3a8a; }

    .callout-warning {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }
    .callout-warning strong { color: #78350f; }

    .callout-ai {
      background: #faf5ff;
      border-left: 4px solid #9333ea;
      color: #581c87;
    }
    .callout-ai strong { color: #3b0764; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 8px 12px;
      border: 1px solid #1e293b;
    }

    td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Grid & Cards */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin: 14px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin: 14px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .feature-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .feature-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
    }

    .feature-card p {
      font-size: 8.5pt;
      color: #64748b;
      margin-bottom: 0;
      line-height: 1.45;
    }

    /* Step-by-step numbers */
    .steps-container {
      margin: 14px 0;
    }

    .step-item {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .step-number {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 9pt;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .step-body {
      flex: 1;
    }

    .step-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .step-desc {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.4;
    }

    /* UI Simulation Boxes (Mockups) */
    .ui-mockup {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #0f172a;
      color: #f8fafc;
      padding: 14px 18px;
      margin: 14px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .ui-mockup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      padding-bottom: 8px;
      margin-bottom: 10px;
      font-size: 8pt;
      color: #94a3b8;
    }

    .ui-mockup-dots {
      display: flex;
      gap: 5px;
    }

    .ui-mockup-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }
    .ui-mockup-dot:nth-child(2) { background: #f59e0b; }
    .ui-mockup-dot:nth-child(3) { background: #10b981; }

    .flashcard-mockup {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #38bdf8;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      max-width: 380px;
      margin: 12px auto;
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
    }

    .flashcard-word {
      font-size: 20pt;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 4px;
    }

    .flashcard-ipa {
      font-size: 11pt;
      color: #38bdf8;
      font-family: monospace;
      margin-bottom: 8px;
    }

    .flashcard-fig {
      font-size: 9.5pt;
      background: rgba(56, 189, 248, 0.15);
      color: #7dd3fc;
      padding: 3px 10px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 12px;
    }

    .tag-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      margin-right: 4px;
      text-transform: uppercase;
    }
    .tag-a1 { background: #dcfce7; color: #15803d; }
    .tag-a2 { background: #dbeafe; color: #1d4ed8; }
    .tag-b1 { background: #fef3c7; color: #b45309; }
    .tag-b2 { background: #ffedd5; color: #c2410c; }
    .tag-c1 { background: #fee2e2; color: #b91c1c; }

    /* Code & Keyboard Shortcut styling */
    code {
      font-family: Consolas, Monaco, "Courier New", monospace;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 8.5pt;
      border: 1px solid #e2e8f0;
    }

    .kbd {
      font-family: monospace;
      background: #e2e8f0;
      color: #1e293b;
      padding: 2px 6px;
      border-radius: 4px;
      border-bottom: 2px solid #94a3b8;
      font-size: 8pt;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- =========================================================================
       PÁGINA 1: PORTADA EJECUTIVA
       ========================================================================= -->
  <div class="cover-page">
    <div class="cover-top">
      <div class="cover-logo-container">
        ${iconBase64 ? `<img src="${iconBase64}" alt="PronounceIt Logo" class="cover-logo-img">` : '<div style="width:100px;height:100px;background:#2563eb;border-radius:20px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:30pt;font-weight:900;">PI</div>'}
      </div>
      <h1 class="cover-title">Pronounce<span>It</span></h1>
      <p class="cover-subtitle">Manual Oficial de Usuario y Guía Integral de Dominio Fonético en Inglés</p>

      <div style="font-size: 11pt; font-weight: 700; color: #1e293b; margin-top: -15px; margin-bottom: 22px;">
        Autor y Desarrollador: <span style="color: #2563eb;">Oscar Mangut Dev</span>
      </div>

      <div class="cover-badge-row">
        <span class="badge badge-blue">🚀 Versión 1.6.5 (Producción)</span>
        <span class="badge badge-purple">✨ Inteligencia Artificial (Gemini)</span>
        <span class="badge badge-green">📱 App Android APK & Web App</span>
        <span class="badge badge-slate">⚡ Almacenamiento Offline First</span>
      </div>

      <div class="cover-summary-card">
        <h4>📖 Acerca de este Manual</h4>
        <p>Este documento constituye la guía exhaustiva y de referencia oficial para la aplicación <strong>PronounceIt</strong>, diseñada y desarrollada por <strong>Oscar Mangut Dev</strong>. Contiene instrucciones paso a paso para la instalación, gestión de vocabulario con asistencia de Inteligencia Artificial, prácticas con tarjetas nemotécnicas (Flashcards), batería de tests con evaluación fonética, conjugación de verbos irregulares, análisis estadístico y gestión segura de copias de seguridad.</p>
      </div>
    </div>

    <div class="cover-footer">
      <div class="cover-footer-left">
        <strong>Oscar Mangut Dev</strong>
        <span>Autor &bull; Creador y Desarrollador &bull; PronounceIt Ecosystem</span>
      </div>
      <div class="cover-footer-right">
        <span>Fecha de edición: Octubre 2026 &bull; Versión 1.6.5</span><br>
        <span>&copy; 2026 Oscar Mangut Dev. Todos los derechos reservados.</span>
      </div>
    </div>
  </div>

  <!-- =========================================================================
       PÁGINA 2: ÍNDICE DE CONTENIDOS
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">Tabla de Contenidos</span>
  </div>

  <div class="toc-container">
    <div class="toc-title">Índice General de Contenidos</div>
    <ul class="toc-list">
      <li class="toc-item level-1">
        <span>1. Introducción y Filosofía de Aprendizaje</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 3</span>
      </li>
      <li class="toc-item level-2">
        <span>1.1. ¿Por qué PronounceIt? La barrera fonética en español</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 3</span>
      </li>
      <li class="toc-item level-2">
        <span>1.2. Los 4 Pilares del Método PronounceIt</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 3</span>
      </li>

      <li class="toc-item level-1">
        <span>2. Requisitos del Sistema e Instalación</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 4</span>
      </li>
      <li class="toc-item level-2">
        <span>2.1. Acceso a la Plataforma Web (Vercel)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 4</span>
      </li>
      <li class="toc-item level-2">
        <span>2.2. Instalación en Dispositivos Android (APK Nativo v1.6.5)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 4</span>
      </li>

      <li class="toc-item level-1">
        <span>3. Inicio Rápido y Cuenta de Usuario</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 5</span>
      </li>
      <li class="toc-item level-2">
        <span>3.1. Registro, Inicio de Sesión y Modo Local</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 5</span>
      </li>
      <li class="toc-item level-2">
        <span>3.2. Gestión de Perfil de Usuario y Avatar</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 5</span>
      </li>
      <li class="toc-item level-2">
        <span>3.3. Modo Oscuro y Modo Claro</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 5</span>
      </li>

      <li class="toc-item level-1">
        <span>4. Estructura y Navegación de la Interfaz</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 6</span>
      </li>
      <li class="toc-item level-2">
        <span>4.1. Barra de Navegación Superior (Top Navigation)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 6</span>
      </li>
      <li class="toc-item level-2">
        <span>4.2. Panel Lateral de Categorías (Sidebar)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 6</span>
      </li>
      <li class="toc-item level-2">
        <span>4.3. Navegación en Dispositivos Móviles y Tablets</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 6</span>
      </li>

      <li class="toc-item level-1">
        <span>5. Módulo Central: Gestión de Vocabulario</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 7</span>
      </li>
      <li class="toc-item level-2">
        <span>5.1. Explorador y Tabla de Vocabulario</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 7</span>
      </li>
      <li class="toc-item level-2">
        <span>5.2. Añadir Palabras con Asistencia IA (Gemini)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 7</span>
      </li>
      <li class="toc-item level-2">
        <span>5.3. Anatomía de una Ficha Fonética (IPA, Guía Figurada, POS, CEFR)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 8</span>
      </li>
      <li class="toc-item level-2">
        <span>5.4. Reproducción de Audio y Síntesis de Voz (TTS)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 8</span>
      </li>
      <li class="toc-item level-2">
        <span>5.5. Categorías, Subcategorías y Filtros Rápidos</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 9</span>
      </li>
      <li class="toc-item level-2">
        <span>5.6. Ciclo de Aprendizaje: Nueva, En Repaso y Dominada</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 9</span>
      </li>

      <li class="toc-item level-1">
        <span>6. Módulos de Práctica y Aprendizaje Activo</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 10</span>
      </li>
      <li class="toc-item level-2">
        <span>6.1. Flashcards Nemotécnicas Interactivas</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 10</span>
      </li>
      <li class="toc-item level-2">
        <span>6.2. Test de Vocabulario y Comprensión Auditiva</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 10</span>
      </li>
      <li class="toc-item level-2">
        <span>6.3. Test de Categorías Gramaticales (Part of Speech)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 11</span>
      </li>
      <li class="toc-item level-2">
        <span>6.4. Entrenador Especializado de Verbos Irregulares</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 11</span>
      </li>
      <li class="toc-item level-2">
        <span>6.5. Modal de Resultados y Calificaciones Detalladas</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 12</span>
      </li>

      <li class="toc-item level-1">
        <span>7. Panel de Estadísticas y Analítica de Progreso</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 13</span>
      </li>
      <li class="toc-item level-2">
        <span>7.1. Indicadores Clave de Desempeño (KPIs)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 13</span>
      </li>
      <li class="toc-item level-2">
        <span>7.2. Historial de Pruebas y Evolución Cronológica</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 13</span>
      </li>

      <li class="toc-item level-1">
        <span>8. Configuración, Respaldos y Privacidad</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 14</span>
      </li>
      <li class="toc-item level-2">
        <span>8.1. Configuración de Gemini AI (API Key)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 14</span>
      </li>
      <li class="toc-item level-2">
        <span>8.2. Parámetros de Síntesis de Voz (TTS)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 14</span>
      </li>
      <li class="toc-item level-2">
        <span>8.3. Exportación e Importación de Datos (JSON y CSV)</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 14</span>
      </li>

      <li class="toc-item level-1">
        <span>9. Preguntas Frecuentes (FAQ) y Solución de Problemas</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 15</span>
      </li>

      <li class="toc-item level-1">
        <span>10. Glosario de Términos y Guía Fonética</span>
        <span class="toc-dots"></span>
        <span class="toc-page">Pág. 16</span>
      </li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 1: INTRODUCCIÓN
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">1. Introducción y Filosofía</span>
  </div>

  <h1><span class="sec-number">1</span> Introducción y Filosofía de Aprendizaje</h1>

  <h2>1.1. ¿Por qué PronounceIt? La barrera fonética para hispanohablantes</h2>
  <p>El inglés es un idioma con una ortografía profundamente no fonémica: a diferencia del español, donde cada letra suele corresponder de manera casi biunívoca con un sonido, el inglés cuenta con más de 44 fonemas distintos representados mediante únicamente 26 letras. Fenómenos como las vocales relajadas (la ubicua vocal <em>schwa</em> /ə/), los grupos consonánticos complejos, la acentuación tónica móvil y las letras mudas constituyen la principal fuente de error y desmotivación en estudiantes de habla hispana.</p>

  <p><strong>PronounceIt</strong> fue concebida, diseñada y desarrollada por <strong>Oscar Mangut Dev</strong> como una solución integral para erradicar este problema. No es un simple diccionario ni una aplicación de memorización genérica; es un entorno de trabajo cognitivo diseñado para que el estudiante construya, practique y automatice el vocabulario con una precisión fonética absoluta.</p>

  <div class="callout callout-info">
    <div class="callout-icon">👨‍💻</div>
    <div class="callout-content">
      <strong>Dirección y Desarrollo Técnico: Oscar Mangut Dev</strong>
      Este proyecto integra una arquitectura multiplataforma React Native / Expo, backend en la nube con Google Firebase y servicios cognitivos con la API de Google Gemini AI para garantizar una experiencia educativa fluida, privada y disponible tanto online como offline.
    </div>
  </div>

  <h2>1.2. Los 4 Pilares del Método PronounceIt</h2>
  <div class="grid-2">
    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#2563eb;">🔊</span> 1. Fonética Dual Adaptada
      </div>
      <p>Cada palabra incorpora simultáneamente la notación técnica universal del <strong>Alfabeto Fonético Internacional (IPA)</strong> y una <strong>Guía Fonética Figurada</strong> adaptada a las reglas fonológicas hispanas (ej. <em>thought</em> &rarr; <em>/θɔːt/</em> &rarr; <strong>"zoot / thot"</strong>), eliminando la ambigüedad desde el primer segundo.</p>
    </div>

    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#7c3aed;">🧠</span> 2. Asistencia Inteligente con IA
      </div>
      <p>Integración nativa con <strong>Google Gemini AI</strong>. Al escribir únicamente un término en inglés, el motor deduce de forma autónoma la categoría gramatical normalizada, nivel CEFR (A1-C2), definición, ejemplos bilingües con resaltado contextual y notas de fonética avanzada.</p>
    </div>

    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#10b981;">⚡</span> 3. Práctica Activa Multinivel
      </div>
      <p>El aprendizaje se consolida mediante 4 modalidades complementarias: <strong>Flashcards interactivas</strong> con autoevaluación, <strong>Tests de vocabulario</strong> con listening, <strong>Tests gramaticales (POS)</strong> y un <strong>Entrenador de Verbos Irregulares</strong> con corrección inteligente de erratas.</p>
    </div>

    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#0ea5e9;">🛡️</span> 4. Soberanía y Acceso Offline
      </div>
      <p>Arquitectura <strong>Offline-First</strong>: todos tus datos, categorías y puntuaciones residen en el almacenamiento de tu dispositivo. Además, cuenta con sincronización opcional en la nube (Firebase) y exportación total en formatos abiertos <strong>JSON y CSV</strong>.</p>
    </div>
  </div>

  <div class="callout callout-tip">
    <div class="callout-icon">💡</div>
    <div class="callout-content">
      <strong>Principio Pedagógico: Aprendizaje Contextual</strong>
      No memorices palabras aisladas. PronounceIt exige un ejemplo en inglés y su traducción en español en cada ficha. Al asociar sonido, significado y contexto oracional, la retención a largo plazo se multiplica por tres.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 2: REQUISITOS DEL SISTEMA E INSTALACIÓN
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">2. Requisitos e Instalación</span>
  </div>

  <h1><span class="sec-number">2</span> Requisitos del Sistema e Instalación</h1>

  <h2>2.1. Acceso a la Plataforma Web</h2>
  <p>La versión web de PronounceIt está optimizada para funcionar en cualquier navegador moderno sin requerir extensiones ni configuraciones adicionales:</p>
  <ul>
    <li><strong>Navegadores recomendados:</strong> Google Chrome (v90+), Microsoft Edge (v90+), Mozilla Firefox (v88+), Safari (v14+).</li>
    <li><strong>Dirección oficial en producción:</strong> <code>https://pronounceit-sand.vercel.app</code></li>
    <li><strong>Capacidades:</strong> Soporte completo para síntesis de voz Web Speech API, diseño responsivo para pantallas táctiles y escritorios con monitores Ultra-Wide.</li>
  </ul>

  <h2>2.2. Instalación en Dispositivos Android (APK Nativo v1.6.5)</h2>
  <p>PronounceIt cuenta con un binario autónomo para el sistema operativo Android compilado con React Native y Expo, lo que asegura un rendimiento óptimo de 60 FPS, animaciones nativas y síntesis de voz sin retrasos.</p>

  <div class="steps-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-body">
        <div class="step-title">Descarga del archivo APK</div>
        <div class="step-desc">Descarga la versión <code>PronounceIt-v1.6.5.apk</code> directamente desde el repositorio oficial de GitHub de lanzamientos o mediante el botón de descarga dentro del panel de Ajustes de la aplicación web.</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-body">
        <div class="step-title">Habilitar orígenes desconocidos</div>
        <div class="step-desc">En tu teléfono Android, accede a <em>Ajustes &gt; Seguridad y Privacidad &gt; Instalar aplicaciones desconocidas</em> y activa el permiso para el navegador o explorador de archivos que utilizaste para descargar el archivo.</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-body">
        <div class="step-title">Instalación y Permisos</div>
        <div class="step-desc">Pulsa sobre el archivo descargado y selecciona <strong>Instalar</strong>. Si el sistema muestra la advertencia de Google Play Protect, pulsa en <em>"Más detalles" &gt; "Instalar de todas formas"</em> (la aplicación no contiene telemetría invasiva ni anuncios).</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">4</div>
      <div class="step-body">
        <div class="step-title">Inicio Inmediato</div>
        <div class="step-desc">Una vez completada la instalación, verás el icono de <strong>PronounceIt</strong> en tu cajón de aplicaciones. Ábrela y tendrás acceso completo tanto online como offline.</div>
      </div>
    </div>
  </div>

  <div class="callout callout-info">
    <div class="callout-icon">ℹ️</div>
    <div class="callout-content">
      <strong>Compatibilidad de Android</strong>
      PronounceIt es compatible con Android 8.0 (Oreo / API Level 26) o superior, funcionando de manera fluida en smartphones y tablets de todas las marcas (Samsung, Xiaomi, Motorola, Pixel, etc.).
    </div>
  </div>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 3: INICIO RÁPIDO Y CUENTA DE USUARIO
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">3. Inicio Rápido y Cuenta</span>
  </div>

  <h1><span class="sec-number">3</span> Inicio Rápido y Cuenta de Usuario</h1>

  <h2>3.1. Modalidades de Sesión</h2>
  <p>PronounceIt ofrece flexibilidad absoluta en su modelo de autenticación:</p>

  <table>
    <thead>
      <tr>
        <th style="width:25%;">Modalidad</th>
        <th style="width:35%;">Características</th>
        <th style="width:40%;">Caso de Uso Recomendado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Modo Conectado (Firebase)</strong></td>
        <td>Autenticación segura con correo y contraseña. Los datos de vocabulario, categorías y notas se respaldan en la nube bajo reglas estrictas de seguridad (Firestore).</td>
        <td>Usuarios que utilizan la aplicación en múltiples dispositivos (ej. móvil y ordenador de sobremesa) y desean sincronización en tiempo real.</td>
      </tr>
      <tr>
        <td><strong>Modo Local / Invitado</strong></td>
        <td>No requiere registro ni conexión a Internet. Todos los datos se almacenan en la memoria persistente local del navegador o de la app móvil.</td>
        <td>Uso inmediato sin trámites, o usuarios que prefieren mantener sus datos 100% privados y gestionar respaldos mediante archivos JSON.</td>
      </tr>
    </tbody>
  </table>

  <h2>3.2. Gestión del Perfil de Usuario</h2>
  <p>Al pulsar sobre el avatar o botón de usuario en la esquina superior derecha (o en el menú de <em>Ajustes</em>):</p>
  <ul>
    <li><strong>Nombre Completo y Alias:</strong> Puedes actualizar tu nombre de visualización en cualquier momento.</li>
    <li><strong>Avatar Personalizado:</strong> Selecciona entre avatares temáticos predefinidos o introduce la URL de tu propia foto de perfil.</li>
    <li><strong>Cambio de Contraseña:</strong> Si estás autenticado mediante Firebase, puedes actualizar tu credencial de acceso directamente desde el modal seguro de edición de perfil.</li>
    <li><strong>Cierre de Sesión Seguro:</strong> Limpia la sesión actual protegiendo tu información en equipos compartidos.</li>
  </ul>

  <h2>3.3. Personalización Visual: Modo Oscuro y Modo Claro</h2>
  <p>PronounceIt incorpora un sistema de diseño de alto contraste con soporte completo para temas visuales:</p>
  <ul>
    <li><strong>Modo Oscuro (Dark Theme - Por defecto):</strong> Paleta basada en Slate (#0f172a / #1e293b), diseñada para reducir la fatiga visual durante sesiones prolongadas de estudio nocturno y ahorrar batería en pantallas OLED de móviles.</li>
    <li><strong>Modo Claro (Light Theme):</strong> Paleta nítida basada en blancos (#ffffff) y grises suaves (#f8fafc) con tipografía de alto contraste, ideal para ambientes luminosos o lectura en exteriores.</li>
  </ul>

  <div class="callout callout-tip">
    <div class="callout-icon">💡</div>
    <div class="callout-content">
      <strong>Conmutación en un Clic</strong>
      Pulsa el icono de sol <span style="font-size:11pt;">☀️</span> o luna <span style="font-size:11pt;">🌙</span> en la barra de navegación superior para alternar de forma instantánea entre temas. Tu preferencia se guardará automáticamente en el almacenamiento del dispositivo.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 4: ARQUITECTURA Y NAVEGACIÓN
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">4. Estructura y Navegación</span>
  </div>

  <h1><span class="sec-number">4</span> Estructura y Navegación de la Interfaz</h1>

  <p>La interfaz de usuario ha sido concebida con un enfoque ergonómico que optimiza los flujos de trabajo tanto en pantallas panorámicas de escritorio como en terminales móviles verticales.</p>

  <div class="ui-mockup">
    <div class="ui-mockup-header">
      <div class="ui-mockup-dots">
        <div class="ui-mockup-dot"></div>
        <div class="ui-mockup-dot"></div>
        <div class="ui-mockup-dot"></div>
      </div>
      <span>Esquema General de la Interfaz (Vista Desktop & Tablet)</span>
      <span>PronounceIt Workspace</span>
    </div>
    <pre style="color:#94a3b8; font-family:Consolas, monospace; font-size:8pt; line-height:1.35;">
+---------------------------------------------------------------------------------------------------+
|  [Logo] PronounceIt   [Buscar término...]    (✨ + Nueva Palabra)  (📁 Respaldos)  [☀️/🌙] [Perfil] |
+------------------------+--------------------------------------------------------------------------+
| CATEGORÍAS & FILTROS   |  PESTAÑAS: [📚 Vocabulario]  [🎴 Flashcards]  [✍️ Tests]  [📊 Métricas]   |
+------------------------+--------------------------------------------------------------------------+
|  ⭐ Todas (450)        |  TABLA PRINCIPAL DE VOCABULARIO:                                         |
|  💖 Favoritos (32)     |  Filtros: [Nivel: TODOS] [Categoría Gramatical] [Estado]                 |
|  🔄 En Repaso (48)     |  ----------------------------------------------------------------------- |
|  ✅ Dominadas (370)    |  Word         | IPA / Pron. Figurada | Cat. Gram. | Nivel | Traducción    |
|  --------------------  |  ----------------------------------------------------------------------- |
|  💼 Business (112)     |  accomplish   | /əˈkʌm.plɪʃ/         | Verbo      | B2    | lograr        |
|  ✈️ Travel (85)        |  insight      | /ˈɪn.saɪt/           | Sustantivo | C1    | percepción    |
|  🍔 Food & Dining (64) |  resilient    | /rɪˈzɪl.i.ənt/       | Adjetivo   | B2    | resiliente    |
+------------------------+--------------------------------------------------------------------------+
    </pre>
  </div>

  <h2>4.1. Barra de Navegación Superior (Top Navigation)</h2>
  <ul>
    <li><strong>Identidad y Versión:</strong> Logotipo interactivo que refresca la vista principal.</li>
    <li><strong>Buscador Universal:</strong> Permite filtrar palabras en tiempo real escribiendo en inglés, español o coincidencia fonética sin recargar la página.</li>
    <li><strong>Botón "+ Añadir Palabra" (Acción Primaria):</strong> Despliega el modal de inserción con asistencia de Inteligencia Artificial.</li>
    <li><strong>Botón "Exportar / Importar":</strong> Acceso inmediato al gestor de copias de seguridad.</li>
    <li><strong>Conmutador de Tema y Perfil:</strong> Ajustes rápidos de iluminación y credenciales.</li>
  </ul>

  <h2>4.2. Panel Lateral de Categorías (Sidebar)</h2>
  <p>Ubicado a la izquierda en pantallas grandes y accesible mediante menú deslizante en móviles:</p>
  <ul>
    <li><strong>Filtros Rápidos del Sistema:</strong>
      <ul>
        <li><em>Todas:</em> Muestra la totalidad de palabras de tu diccionario personal.</li>
        <li><em>Favoritos:</em> Colección de palabras marcadas con estrella para estudio prioritario.</li>
        <li><em>Por Estado:</em> Nuevas, En Repaso o Dominadas.</li>
      </ul>
    </li>
    <li><strong>Árbol de Categorías Temáticas:</strong> Grupos personalizables (ej. <em>Negocios, Medicina, Tecnología, Cotidiano</em>) con iconos visuales y contadores actualizados de palabras activas.</li>
    <li><strong>Gestión de Categorías:</strong> Botón para crear nuevas categorías con selector de icono y nombre personalizado.</li>
  </ul>

  <h2>4.3. Navegación en Dispositivos Móviles (Android / Web Móvil)</h2>
  <p>En pantallas verticales de smartphones, la interfaz se adapta automáticamente:</p>
  <ul>
    <li>Las pestañas principales se trasladan a una <strong>barra inferior fija (Bottom Bar)</strong> con iconos grandes y respuesta táctil inmediata.</li>
    <li>El panel de categorías se convierte en un botón de filtro contextual que no satura el campo visual.</li>
    <li>Las acciones sobre las palabras se condensan en tarjetas táctiles con soporte para pulsación larga.</li>
  </ul>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 5: GESTIÓN DE VOCABULARIO
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">5. Gestión de Vocabulario</span>
  </div>

  <h1><span class="sec-number">5</span> Módulo Central: Gestión de Vocabulario</h1>

  <h2>5.1. Explorador y Tabla de Vocabulario</h2>
  <p>El núcleo de PronounceIt es su visor de vocabulario de alta densidad. Cada fila o tarjeta contiene información lingüística minuciosa:</p>

  <table>
    <thead>
      <tr>
        <th style="width:20%;">Columna / Elemento</th>
        <th style="width:40%;">Descripción Detallada</th>
        <th style="width:40%;">Ejemplo Práctico</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Término en Inglés</strong></td>
        <td>Palabra o locución principal. Incluye botón táctil para reproducir su pronunciación en audio inmediatamente.</td>
        <td><strong>serendipity</strong> 🔊</td>
      </tr>
      <tr>
        <td><strong>Transcripción IPA</strong></td>
        <td>Notación fonética técnica internacional estándar, útil para conocer la posición de la lengua y acentuación exacta.</td>
        <td><code>/ˌser.ənˈdɪp.ə.ti/</code></td>
      </tr>
      <tr>
        <td><strong>Guía Fonética Figurada</strong></td>
        <td>Transcripción adaptada a las reglas de pronunciación en español con sílabas mayúsculas en el acento tónico.</td>
        <td><strong>seh-ruhn-DIP-uh-tee</strong></td>
      </tr>
      <tr>
        <td><strong>Categoría Gramatical</strong></td>
        <td>Parte de la oración normalizada en español: Sustantivo, Verbo, Adjetivo, Adverbio, Preposición, etc.</td>
        <td><span class="badge badge-purple">Sustantivo</span></td>
      </tr>
      <tr>
        <td><strong>Nivel CEFR</strong></td>
        <td>Nivel del Marco Común Europeo de Referencia para las Lenguas (A1, A2, B1, B2, C1, C2).</td>
        <td><span class="tag-chip tag-c1">C1</span></td>
      </tr>
      <tr>
        <td><strong>Traducción y Definición</strong></td>
        <td>Equivalente natural en español y breve explicación del significado conceptual.</td>
        <td><em>"Hallazgo afortunado e inesperado"</em></td>
      </tr>
      <tr>
        <td><strong>Ejemplo Bilingüe</strong></td>
        <td>Oración real en inglés con el término resaltado en negrita y su traducción al español debajo.</td>
        <td><em>"Finding this book was pure <strong>serendipity</strong>."</em></td>
      </tr>
      <tr>
        <td><strong>Estado y Acciones</strong></td>
        <td>Etiqueta de progreso (Nueva / Repaso / Dominada), estrella de favorito, botón de edición y eliminación.</td>
        <td>⭐ | ✏️ | 🗑️</td>
      </tr>
    </tbody>
  </table>

  <h2>5.2. Añadir Palabras con Asistencia IA (Gemini AI)</h2>
  <p>PronounceIt elimina la tediosa tarea de buscar manualmente en diccionarios externos gracias al motor de autocompletado impulsado por <strong>Gemini AI</strong>.</p>

  <div class="steps-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-body">
        <div class="step-title">Abrir el Modal de Añadir Palabra</div>
        <div class="step-desc">Haz clic en el botón azul <strong>"+ Añadir Palabra"</strong> situado en la barra superior o en el botón flotante inferior en el móvil.</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-body">
        <div class="step-title">Escribir la Palabra en Inglés</div>
        <div class="step-desc">Introduce el término en el campo de texto (por ejemplo, <code>thorough</code> o <code>breakthrough</code>).</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-body">
        <div class="step-title">Pulsar el botón de Inteligencia Artificial (✨)</div>
        <div class="step-desc">Presiona el botón con el icono de estrellas mágicas. En menos de 2 segundos, el motor de IA consultará el modelo de lenguaje y rellenará de manera inteligente todos los campos:
          <ul>
            <li>Transcripción fonética IPA real y verificada.</li>
            <li>Guía figurada adaptada al oído del hispanohablante.</li>
            <li>Nota explicativa con consejos específicos para pronunciar la palabra correctamente (ej. "La 'gh' final es completamente muda").</li>
            <li>Categoría gramatical y nivel CEFR calibrado.</li>
            <li>Traducción natural en español y definición precisa.</li>
            <li>Oración de ejemplo en inglés y en español.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">4</div>
      <div class="step-body">
        <div class="step-title">Revisar y Guardar</div>
        <div class="step-desc">Si lo deseas, puedes modificar cualquiera de los campos generados, asignar una o varias categorías temáticas y presionar <strong>"Guardar Palabra"</strong>. La palabra ingresará inmediatamente a tu lista en estado <strong>Nueva</strong>.</div>
      </div>
    </div>
  </div>

  <div class="callout callout-ai">
    <div class="callout-icon">✨</div>
    <div class="callout-content">
      <strong>Funcionamiento Híbrido: Con o Sin Clave API Personal</strong>
      PronounceIt incluye un diccionario local de respaldo integrado de más de miles de términos comunes. Si configuras tu propia clave gratuita de Google Gemini en <em>Ajustes</em>, la aplicación podrá autocompletar cualquier palabra, modismo, phrasal verb o término técnico existente en el idioma inglés sin límites.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 5 CONTINUACIÓN: ANATOMÍA Y FONÉTICA
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">5. Gestión de Vocabulario (Cont.)</span>
  </div>

  <h2>5.3. Anatomía de una Ficha Fonética</h2>
  <p>Para comprender la potencia didáctica de PronounceIt, observemos la estructura desglosada de una palabra:</p>

  <div class="ui-mockup" style="background:#1e293b; border-color:#475569;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <span style="font-size:16pt; font-weight:800; color:#ffffff;">throughout</span>
        <span class="tag-chip tag-b2" style="margin-left:8px;">NIVEL B2</span>
        <span class="tag-chip" style="background:#6366f1; color:#fff;">PREPOSICIÓN</span>
      </div>
      <div style="color:#38bdf8; font-size:11pt; font-weight:bold;">🔊 Reproducir Audio</div>
    </div>

    <div style="background:#0f172a; padding:10px 14px; border-radius:8px; margin-bottom:12px;">
      <div style="display:flex; gap:20px; font-size:9pt;">
        <div><strong>IPA Técnico:</strong> <code style="color:#38bdf8; background:transparent; border:none;">/θruːˈaʊt/</code></div>
        <div><strong>Pronunciación Figurada:</strong> <span style="color:#a7f3d0; font-weight:bold;">zru-ÁUT / thru-ÁUT</span></div>
      </div>
      <div style="font-size:8pt; color:#cbd5e1; margin-top:6px;">
        💡 <em>Nota fonética:</em> La combinación inicial "th" es sorda /θ/ (como la 'z' española de 'zapato'). El acento recae en la segunda sílaba.
      </div>
    </div>

    <div style="font-size:8.5pt; color:#f1f5f9; margin-bottom:6px;">
      <strong>Traducción:</strong> A lo largo de / Por todo
    </div>
    <div style="font-size:8.5pt; color:#94a3b8; font-style:italic;">
      <strong>Ejemplo:</strong> "The music echoed <strong>throughout</strong> the entire building."<br>
      <strong>Traducción ej.:</strong> "La música resonó a lo largo de todo el edificio."
    </div>
  </div>

  <h2>5.4. Reproducción de Audio y Síntesis de Voz (TTS)</h2>
  <p>PronounceIt cuenta con integración directa con los motores de <strong>Text-To-Speech (TTS)</strong> más avanzados:</p>
  <ul>
    <li><strong>En Dispositivos Android:</strong> Emplea el motor nativo de Google Text-to-Speech preinstalado en el sistema operativo, permitiendo una pronunciación natural de alta fidelidad sin requerir conexión a Internet.</li>
    <li><strong>En Navegadores Web:</strong> Utiliza el estándar <code>window.speechSynthesis</code> con priorización de voces en inglés estadounidense (<em>en-US</em>) y británico (<em>en-GB</em>).</li>
    <li><strong>Ajustes de Velocidad:</strong> En el panel de <em>Ajustes</em>, puedes graduar la velocidad de reproducción entre <strong>0.75x</strong> (ideal para analizar la articulación de cada sonido en principiantes) y <strong>1.0x</strong> (velocidad conversacional nativa).</li>
  </ul>

  <h2>5.5. Categorías, Subcategorías y Filtros Rápidos</h2>
  <p>Organizar el léxico por temas acelera la asociación mental:</p>
  <ul>
    <li><strong>Asignación Múltiple:</strong> Una misma palabra puede pertenecer simultáneamente a varios grupos y subcategorías (ej. <em>budget</em> puede estar en <em>Negocios &gt; Finanzas</em> y también en <em>Cotidiano</em>).</li>
    <li><strong>Edición de Categorías:</strong> En cualquier momento puedes pulsar sobre el botón de edición de categorías en el panel lateral para cambiar el nombre, color o icono descriptivo.</li>
  </ul>

  <h2>5.6. Ciclo de Aprendizaje: Nueva &rarr; En Repaso &rarr; Dominada</h2>
  <div class="grid-3">
    <div class="feature-card" style="border-top:3px solid #3b82f6;">
      <div class="feature-card-header" style="color:#2563eb;">
        1. Nueva
      </div>
      <p>Palabra recién añadida a tu banco. Requiere una primera toma de contacto fonético, escucha del audio y lectura comprensiva del ejemplo.</p>
    </div>

    <div class="feature-card" style="border-top:3px solid #f59e0b;">
      <div class="feature-card-header" style="color:#d97706;">
        2. En Repaso
      </div>
      <p>Palabra que has practicado en flashcards o tests pero en la que ocasionalmente dudas o cometes fallos. El algoritmo la incluirá con mayor frecuencia.</p>
    </div>

    <div class="feature-card" style="border-top:3px solid #10b981;">
      <div class="feature-card-header" style="color:#059669;">
        3. Dominada
      </div>
      <p>Término consolidado en tu memoria a largo plazo. Tu tasa de acierto es superior al 90% y eres capaz de reproducir su pronunciación sin vacilación.</p>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 6: MÓDULOS DE PRÁCTICA
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">6. Práctica y Aprendizaje Activo</span>
  </div>

  <h1><span class="sec-number">6</span> Módulos de Práctica y Aprendizaje Activo</h1>

  <p>Para garantizar que el vocabulario no quede almacenado pasivamente, PronounceIt provee 4 modalidades de entrenamiento interactivo accesibles desde la barra de pestañas:</p>

  <h2>6.1. Flashcards Nemotécnicas Interactivas</h2>
  <p>Basado en el principio científico de <strong>recuerdo activo (Active Recall)</strong>. Al entrar en la pestaña <em>Flashcards</em>:</p>

  <div class="flashcard-mockup">
    <div style="font-size:7.5pt; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Tarjeta Activa (1 de 25)</div>
    <div class="flashcard-word">knowledge</div>
    <div class="flashcard-ipa">/ˈnɒl.ɪdʒ/</div>
    <div class="flashcard-fig">NÓ-lidzh (la 'k' inicial no se pronuncia)</div>
    <div style="margin-top:10px;">
      <span class="tag-chip tag-b1">B1</span>
      <span class="tag-chip" style="background:#22c55e; color:#fff;">SUSTANTIVO</span>
    </div>
    <div style="font-size:8pt; color:#64748b; margin-top:16px;">[ Toca la tarjeta para voltear y ver la traducción ]</div>
  </div>

  <div class="steps-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-body">
        <div class="step-title">Inspección Fonética Frontal</div>
        <div class="step-desc">Se muestra la palabra en inglés, el nivel, la transcripción IPA y la guía figurada. Pulsa el botón de altavoz 🔊 para escuchar el audio nativo tantas veces como necesites antes de intentar recordarla.</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-body">
        <div class="step-title">Volteo y Verificación Posterior</div>
        <div class="step-desc">Toca sobre la tarjeta para girarla: aparecerá la traducción en español, la definición y la oración de ejemplo con el término contextualizado.</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-body">
        <div class="step-title">Autoevaluación Consciente</div>
        <div class="step-desc">Elige entre dos botones:
          <ul>
            <li><strong>"Repasar" (Amarillo / Naranja):</strong> Si dudaste o no recordabas el significado. La palabra se mantendrá en estado <em>En Repaso</em> para volver a preguntártela pronto.</li>
            <li><strong>"Dominada" (Verde):</strong> Si la pronunciaste y recordaste a la perfección. La palabra se promoverá automáticamente a <em>Dominada</em> en tu vocabulario.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <h2>6.2. Test de Vocabulario y Comprensión Auditiva</h2>
  <p>La pestaña <em>Tests</em> incluye un modo de examen tipo test con opciones múltiples:</p>
  <ul>
    <li><strong>Generación Dinámica de Distractores:</strong> La aplicación selecciona aleatoriamente 4 opciones verosímiles del mismo nivel o ámbito léxico, evitando patrones previsibles.</li>
    <li><strong>Filtros por Nivel:</strong> Puedes configurar un test enfocado exclusivamente en palabras de nivel <strong>A1/A2 (Básico)</strong>, <strong>B1/B2 (Intermedio)</strong> o <strong>C1/C2 (Avanzado)</strong>.</li>
    <li><strong>Soporte Auditivo:</strong> Cada pregunta cuenta con un botón para escuchar la palabra antes de responder, entrenando el oído frente a la grafía.</li>
  </ul>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 6 CONTINUACIÓN: TESTS GRAMATICALES Y VERBOS IRREGULARES
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">6. Práctica y Aprendizaje Activo (Cont.)</span>
  </div>

  <h2>6.3. Test de Categorías Gramaticales (Part of Speech)</h2>
  <p>Dominar la función de una palabra dentro de la estructura oracional es indispensable para expresarse con fluidez:</p>
  <ul>
    <li><strong>Modo Identificación:</strong> Se presenta una palabra (ej. <em>reluctantly</em>) y el usuario debe discernir si se trata de un <em>Adverbio</em>, <em>Adjetivo</em>, <em>Preposición</em> o <em>Conjunción</em>.</li>
    <li><strong>Modo Contextual:</strong> Se evalúa cómo el cambio de sufijo o contexto altera la función gramatical de una misma raíz léxica (ej. <em>compete</em> [Verbo] vs <em>competition</em> [Sustantivo] vs <em>competitive</em> [Adjetivo]).</li>
  </ul>

  <h2>6.4. Entrenador Especializado de Verbos Irregulares</h2>
  <p>Los verbos irregulares son el talón de Aquiles de la gramática inglesa. PronounceIt integra un módulo específico con base de datos propia de verbos clasificados por nivel de dificultad:</p>

  <div class="ui-mockup" style="background:#0f172a; border-color:#3b82f6;">
    <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:8pt; color:#94a3b8;">
      <span>Módulo de Verbos Irregulares (Pregunta 4 de 10)</span>
      <span>Nivel: Intermedio (B1)</span>
    </div>
    <div style="text-align:center; margin:10px 0;">
      <span style="font-size:18pt; font-weight:800; color:#ffffff;">freeze</span>
      <div style="font-size:8.5pt; color:#38bdf8; margin-top:2px;">Traducción: congelar / congelarse &bull; 🔊 /friːz/</div>
    </div>
    <div style="display:flex; gap:16px; margin-top:14px;">
      <div style="flex:1; background:#1e293b; padding:8px 12px; border-radius:6px; border:1px solid #334155;">
        <span style="font-size:7.5pt; color:#94a3b8; display:block;">PAST SIMPLE:</span>
        <span style="font-size:10pt; color:#38bdf8; font-weight:bold;">froze</span>
      </div>
      <div style="flex:1; background:#1e293b; padding:8px 12px; border-radius:6px; border:1px solid #334155;">
        <span style="font-size:7.5pt; color:#94a3b8; display:block;">PAST PARTICIPLE:</span>
        <span style="font-size:10pt; color:#10b981; font-weight:bold;">frozen</span>
      </div>
    </div>
  </div>

  <div class="callout callout-tip">
    <div class="callout-icon">💡</div>
    <div class="callout-content">
      <strong>Algoritmo Inteligente de Corrección de Erratas (Typo-Tolerant)</strong>
      ¿Escribiste por accidente <em>"froozen"</em> en vez de <em>"frozen"</em>? El evaluador de PronounceIt utiliza un cálculo de distancia de Levenshtein: no te penaliza con un cero si se trata de un simple desliz de teclado de 1 letra, indicándote la errata sin frustrar tu avance pedagógico.
    </div>
  </div>

  <h2>6.5. Modal de Resultados y Calificaciones Detalladas</h2>
  <p>Al concluir cualquier test, se despliega una pantalla analítica con el desglose exacto de la prueba:</p>
  <ul>
    <li><strong>Calificación sobre 10 y Porcentaje de Aciertos:</strong> Nota numérica calculada de forma ponderada (ej. <em>8.5 / 10 &bull; 85%</em>).</li>
    <li><strong>Medalla y Rango de Dominio:</strong> Distintivo visual (<em>Excelente, Notable, Aprobado o Requiere Repaso</em>).</li>
    <li><strong>Revisión Ítem por Ítem:</strong> Lista desplegable donde puedes examinar cada pregunta, ver la respuesta correcta frente a lo que escribiste, y escuchar nuevamente la pronunciación nativa.</li>
    <li><strong>Historial Persistente:</strong> El resultado se almacena automáticamente en tu historial personal para graficar tu evolución a lo largo del tiempo.</li>
  </ul>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 7: PANEL DE ESTADÍSTICAS
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">7. Estadísticas y Progreso</span>
  </div>

  <h1><span class="sec-number">7</span> Panel de Estadísticas y Analítica de Progreso</h1>

  <p>La pestaña <em>Estadísticas</em> ofrece una radiografía cuantitativa en tiempo real de tu aprendizaje, fundamental para mantener la motivación y fijar objetivos alcanzables.</p>

  <h2>7.1. Indicadores Clave de Desempeño (KPIs)</h2>

  <div class="grid-3">
    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#2563eb;">📚</span> Total Palabras
      </div>
      <p>Volumen total de vocabulario registrado en tu diccionario personal. Permite medir la expansión de tu léxico mes a mes.</p>
    </div>

    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#10b981;">🏆</span> Tasa de Dominio
      </div>
      <p>Porcentaje de palabras promovidas a estado <strong>Dominada</strong> sobre el total (ej. 78%). Tu objetivo es superar el 80% antes de subir de nivel CEFR.</p>
    </div>

    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#f59e0b;">🔥</span> Racha y Constancia
      </div>
      <p>Registro de actividad continua para crear el hábito diario indispensable para la asimilación del inglés.</p>
    </div>
  </div>

  <h2>7.2. Distribución de Vocabulario por Nivel CEFR</h2>
  <p>Un gráfico de barras horizontales muestra cuántas palabras posees en cada uno de los niveles estándar europeos:</p>

  <table>
    <thead>
      <tr>
        <th style="width:15%;">Nivel CEFR</th>
        <th style="width:25%;">Descripción</th>
        <th style="width:35%;">Volumen Típico Recomendado</th>
        <th style="width:25%;">Estado en App</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="tag-chip tag-a1">A1</span></td>
        <td>Principiante elemental</td>
        <td>300 - 500 palabras cotidianas</td>
        <td>Base comunicativa básica</td>
      </tr>
      <tr>
        <td><span class="tag-chip tag-a2">A2</span></td>
        <td>Plataforma / Básico alto</td>
        <td>800 - 1.200 palabras de entorno</td>
        <td>Interacciones cotidianas</td>
      </tr>
      <tr>
        <td><span class="tag-chip tag-b1">B1</span></td>
        <td>Intermedio independiente</td>
        <td>2.000 palabras de trabajo y viajes</td>
        <td>Fluidez funcional general</td>
      </tr>
      <tr>
        <td><span class="tag-chip tag-b2">B2</span></td>
        <td>Intermedio avanzado</td>
        <td>3.500 - 4.500 palabras complejas</td>
        <td>Argumentación profesional</td>
      </tr>
      <tr>
        <td><span class="tag-chip tag-c1">C1</span></td>
        <td>Dominio operativo eficaz</td>
        <td>6.000+ términos idiomáticos y técnicos</td>
        <td>Fluidez nativa y académica</td>
      </tr>
    </tbody>
  </table>

  <h2>7.3. Historial de Pruebas y Evolución Cronológica</h2>
  <p>Al final del panel de estadísticas se sitúa la lista cronológica con los últimos tests completados:</p>
  <ul>
    <li>Fecha y hora exacta de realización.</li>
    <li>Tipo de evaluación (Vocabulario general, Gramática o Verbos Irregulares).</li>
    <li>Puntuación obtenida y etiqueta de rendimiento.</li>
    <li>Capacidad para consultar el detalle de aciertos/errores de pruebas pasadas.</li>
  </ul>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 8: CONFIGURACIÓN Y RESPALDOS
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">8. Configuración y Respaldos</span>
  </div>

  <h1><span class="sec-number">8</span> Configuración, Respaldos y Privacidad</h1>

  <h2>8.1. Configuración de Gemini AI (API Key Personal)</h2>
  <p>Para desbloquear el autocompletado ilimitado de palabras con Inteligencia Artificial, puedes vincular tu propia clave gratuita de Google Gemini:</p>

  <div class="steps-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-body">
        <div class="step-title">Obtener la clave gratuita en Google AI Studio</div>
        <div class="step-desc">Visita el portal oficial de Google <code>https://aistudio.google.com/app/apikey</code> e inicia sesión con tu cuenta de Google. Pulsa en <strong>"Create API key"</strong> y copia el código generado.</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-body">
        <div class="step-title">Pegar la clave en PronounceIt</div>
        <div class="step-desc">Accede a la pestaña <em>Ajustes</em>, localiza la sección <strong>"Configuración de Gemini AI"</strong> y pega tu clave en el campo de texto correspondiente.</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-body">
        <div class="step-title">Verificar Conexión y Guardar</div>
        <div class="step-desc">Presiona el botón <strong>"Probar Conexión"</strong>. La aplicación realizará una llamada de prueba segura; si la clave es correcta, se encenderá el indicador verde de estado verificado. Tu clave se guardará de forma cifrada en tu dispositivo.</div>
      </div>
    </div>
  </div>

  <h2>8.2. Exportación e Importación de Datos (Copias de Seguridad)</h2>
  <p>Tus horas de estudio y tu banco de vocabulario representan un valor incalculable. PronounceIt garantiza que jamás pierdas tu progreso:</p>

  <div class="grid-2">
    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#2563eb;">📥</span> Exportación en JSON (Recomendada)
      </div>
      <p>Genera un archivo completo con todas tus palabras, transcripciones fonéticas, notas, categorías, estados de aprendizaje y fecha de revisión. Es el formato idóneo para clonar tu vocabulario en otro teléfono o restaurar el sistema en caso de formateo.</p>
    </div>

    <div class="feature-card">
      <div class="feature-card-header">
        <span style="color:#10b981;">📊</span> Exportación en CSV (Excel)
      </div>
      <p>Crea una hoja de cálculo tabular compatible con Microsoft Excel, Google Sheets o Apple Numbers. Ideal para imprimir listas de estudio en papel o analizar tu vocabulario mediante filtros externos.</p>
    </div>
  </div>

  <h3>Procedimiento de Restauración / Importación:</h3>
  <ol>
    <li>Haz clic en el botón <strong>"Exportar / Importar"</strong> de la barra superior.</li>
    <li>Selecciona la pestaña <strong>"Importar"</strong>.</li>
    <li>Arrastra o selecciona el archivo <code>.json</code> de tu copia de seguridad previa.</li>
    <li>Elige si deseas fusionar el vocabulario nuevo con el existente o reemplazar completamente la base de datos.</li>
    <li>Confirma la operación: tus datos se cargarán de forma instantánea.</li>
  </ol>

  <div class="callout callout-warning">
    <div class="callout-icon">⚠️</div>
    <div class="callout-content">
      <strong>Precaución con la Eliminación de Datos</strong>
      En el panel de Ajustes existe la opción de "Restablecer Base de Datos Local" y "Eliminar Cuenta". Estas acciones son irreversibles y purgan todas las palabras del dispositivo. Realiza siempre una exportación en JSON antes de efectuar un restablecimiento general.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 9: PREGUNTAS FRECUENTES (FAQ)
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">9. FAQ y Soporte</span>
  </div>

  <h1><span class="sec-number">9</span> Preguntas Frecuentes (FAQ) y Solución de Problemas</h1>

  <div class="feature-card" style="margin-bottom:14px;">
    <div class="feature-card-header">
      ❓ ¿Por qué no se escucha el audio al pulsar el botón del altavoz?
    </div>
    <p><strong>En Android:</strong> Asegúrate de que el volumen multimedia de tu teléfono esté activo (no en modo silencio). Ve a <em>Ajustes de Android &gt; Sistema &gt; Accesibilidad &gt; Síntesis de voz</em> y comprueba que el motor "Reconocimiento y síntesis de voz de Google" tenga instalado el paquete de voz en inglés.<br>
    <strong>En Navegador Web:</strong> Algunos navegadores bloquean la reproducción automática de sonido hasta que el usuario hace clic por primera vez en la página. Comprueba también que los permisos de sonido del sitio no estén silenciados.</p>
  </div>

  <div class="feature-card" style="margin-bottom:14px;">
    <div class="feature-card-header">
      ❓ ¿Puedo utilizar PronounceIt sin conexión a Internet?
    </div>
    <p><strong>Sí, al 100%.</strong> Tanto la app Android como la versión Web (vía caché PWA) son Offline-First. Puedes repasar tu vocabulario, reproducir audio y realizar tests completos sin datos móviles ni Wi-Fi. La única funcionalidad que requiere acceso a Internet es la generación asistida de nuevas palabras mediante la API de Gemini AI.</p>
  </div>

  <div class="feature-card" style="margin-bottom:14px;">
    <div class="feature-card-header">
      ❓ ¿Cómo transfiero mis palabras del ordenador a mi teléfono móvil Android?
    </div>
    <p>Existen dos métodos sumamente sencillos:
      <ol style="margin-top:6px; margin-left:16px;">
        <li><strong>Vía Copia de Seguridad JSON:</strong> En el ordenador, pulsa en <em>Exportar</em> y descarga el archivo <code>pronounceit_backup.json</code>. Envíalo a tu móvil (vía Telegram, WhatsApp, email o cable) y en la app Android pulsa en <em>Importar</em> para cargar todas tus palabras.</li>
        <li><strong>Vía Cuenta Firebase:</strong> Inicia sesión con el mismo correo electrónico y contraseña en ambos dispositivos y tus datos se sincronizarán a través de la nube de forma transparente.</li>
      </ol>
    </p>
  </div>

  <div class="feature-card" style="margin-bottom:14px;">
    <div class="feature-card-header">
      ❓ El autocompletado de IA devuelve error de cuota o clave inválida. ¿Qué hago?
    </div>
    <p>Verifica en <em>Ajustes &gt; Configuración Gemini AI</em> que la clave API esté copiada exactamente como la generó Google AI Studio, sin espacios iniciales ni finales. Recuerda que las claves gratuitas de Google cuentan con un límite de peticiones por minuto sobradamente amplio para el estudio individual.</p>
  </div>

  <div class="page-break"></div>

  <!-- =========================================================================
       SECCIÓN 10: GLOSARIO Y GUÍA FONÉTICA
       ========================================================================= -->
  <div class="doc-running-header">
    <span>PronounceIt v1.6.5 &bull; Oscar Mangut Dev</span>
    <span class="app-badge">10. Glosario y Guía Fonética</span>
  </div>

  <h1><span class="sec-number">10</span> Glosario de Términos y Guía Fonética</h1>

  <h2>10.1. Tabla Rápida de Símbolos Fonéticos (IPA) para Hispanohablantes</h2>
  <p>Esta tabla recoge los símbolos que suelen presentar mayor dificultad a los hablantes nativos de español:</p>

  <table>
    <thead>
      <tr>
        <th style="width:12%;">Símbolo</th>
        <th style="width:28%;">Descripción del Sonido</th>
        <th style="width:25%;">Palabra en Inglés</th>
        <th style="width:35%;">Equivalente / Truco en Español</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>/ə/</code></td>
        <td><strong>Schwa:</strong> Sonido vocálico neutro y ultra relajado, nunca acentuado.</td>
        <td><strong>a</strong>bout, comput<strong>er</strong></td>
        <td>Boca entreabierta sin tensar los labios; como un quejido muy suave.</td>
      </tr>
      <tr>
        <td><code>/θ/</code></td>
        <td>Fricativa dental sorda (como la 'z' peninsular).</td>
        <td><strong>th</strong>ink, heal<strong>th</strong></td>
        <td>Punta de la lengua entre los dientes dejando pasar el aire sin vibrar cuerdas.</td>
      </tr>
      <tr>
        <td><code>/ð/</code></td>
        <td>Fricativa dental sonora (con vibración vocal).</td>
        <td><strong>th</strong>is, mo<strong>th</strong>er</td>
        <td>Punta de la lengua entre los dientes pero haciendo vibrar la garganta (como la 'd' suave en 'lado').</td>
      </tr>
      <tr>
        <td><code>/ɪ/</code></td>
        <td>'i' corta relajada (más abierta que la 'i' española).</td>
        <td>sh<strong>i</strong>p, s<strong>i</strong>t</td>
        <td>Posiciona la boca para decir 'e' pero pronuncia 'i'.</td>
      </tr>
      <tr>
        <td><code>/iː/</code></td>
        <td>'i' larga tensa sonriente.</td>
        <td>sh<strong>ee</strong>p, m<strong>ee</strong>t</td>
        <td>Similar a la 'i' española pero estirando las comisuras como sonriendo.</td>
      </tr>
      <tr>
        <td><code>/æ/</code></td>
        <td>Vocal abierta intermedia entre 'a' y 'e'.</td>
        <td>c<strong>a</strong>t, b<strong>a</strong>d</td>
        <td>Abre la mandíbula ampliamente como para decir 'a', pero articula una 'e'.</td>
      </tr>
      <tr>
        <td><code>/ʌ/</code></td>
        <td>'a' corta gutural seca.</td>
        <td>c<strong>u</strong>t, m<strong>u</strong>st</td>
        <td>Similar a una 'a' corta emitida desde la parte posterior de la garganta.</td>
      </tr>
      <tr>
        <td><code>/ʃ/</code></td>
        <td>Fricativa postalveolar sorda (sonido de mandar callar).</td>
        <td><strong>sh</strong>ip, na<strong>ti</strong>on</td>
        <td>Sonido "shhhh" prolongado.</td>
      </tr>
      <tr>
        <td><code>/tʃ/</code></td>
        <td>Africada postalveolar sorda.</td>
        <td><strong>ch</strong>ur<strong>ch</strong>, ma<strong>tch</strong></td>
        <td>Exactamente igual a la 'ch' en 'chocolate'.</td>
      </tr>
      <tr>
        <td><code>/dʒ/</code></td>
        <td>Africada postalveolar sonora.</td>
        <td><strong>j</strong>udge, bri<strong>dg</strong>e</td>
        <td>Como una 'ch' pero haciendo vibrar las cuerdas vocales desde el inicio.</td>
      </tr>
    </tbody>
  </table>

  <h2>10.2. Acrónimos y Siglas Empleadas en la Aplicación</h2>
  <ul>
    <li><strong>IPA (International Phonetic Alphabet):</strong> Sistema estandarizado de símbolos gráficos para representar de forma inequívoca los sonidos de cualquier lengua humana.</li>
    <li><strong>CEFR (MCER):</strong> Marco Común Europeo de Referencia para las lenguas (niveles oficiales A1, A2, B1, B2, C1 y C2).</li>
    <li><strong>POS (Part of Speech):</strong> Categoría gramatical que define la función morfosintáctica de un término (sustantivo, adjetivo, verbo, etc.).</li>
    <li><strong>SRS (Spaced Repetition System):</strong> Técnica de estudio fundamentada en la curva del olvido de Ebbinghaus, que programa revisiones espaciadas en el tiempo.</li>
    <li><strong>TTS (Text-to-Speech):</strong> Tecnología informática de conversión automática de texto escrito a voz sintética audible.</li>
  </ul>

  <div style="margin-top:40px; padding:22px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; text-align:center;">
    <h3 style="color:#0f172a; margin-bottom:6px;">🎉 ¡Comienza a Dominar tu Pronunciación Hoy Mismo!</h3>
    <p style="font-size:9pt; color:#64748b; margin-bottom:12px;">Con constancia, escucha atenta y el método de fonética dual de PronounceIt, tus progresos en fluidez oral y comprensión auditiva serán evidentes desde las primeras semanas.</p>
    <div style="font-size:9pt; color:#1e293b; font-weight:700;">
      PronounceIt v1.6.5 &bull; Creado y Desarrollado por <span style="color:#2563eb;">Oscar Mangut Dev</span>
    </div>
    <div style="font-size:8pt; color:#94a3b8; margin-top:4px;">
      &copy; 2026 Oscar Mangut Dev &bull; Todos los derechos reservados &bull; React Native, Expo, Firebase & Gemini AI
    </div>
  </div>

</body>
</html>
`;

// Save the HTML file
const htmlPath = path.join(rootDir, 'manual_usuario.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML manual generated at:', htmlPath);

// Target PDF path
const pdfPath = path.join(rootDir, 'Manual_de_Usuario_PronounceIt.pdf');

// Run Edge headless to render to PDF
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  htmlPath
];

console.log('Starting Edge PDF rendering...');
const child = spawn(edgePath, args, { stdio: 'inherit' });

child.on('exit', (code) => {
  if (code === 0) {
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log('PDF generated successfully!');
      console.log('Path:', pdfPath);
      console.log('Size:', (stats.size / 1024).toFixed(2), 'KB');
    } else {
      console.error('Edge finished with code 0 but PDF was not found at:', pdfPath);
    }
  } else {
    console.error('Edge exited with code:', code);
  }
});
