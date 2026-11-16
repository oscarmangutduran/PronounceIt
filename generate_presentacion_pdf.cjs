/**
 * PronounceIt — Generador de Presentación para Clientes
 * Formato: A4 landscape, estilo diapositivas ejecutivas
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const rootDir  = __dirname;
const assetsDir = path.join(rootDir, 'client', 'assets');

function getBase64(filename) {
  try {
    const fullPath = path.join(assetsDir, filename);
    if (fs.existsSync(fullPath)) {
      const ext  = path.extname(filename).replace('.','').toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                 : ext === 'svg' ? 'image/svg+xml' : 'image/png';
      return 'data:' + mime + ';base64,' + fs.readFileSync(fullPath).toString('base64');
    }
  } catch(e) { console.error('img error:', e.message); }
  return '';
}

const ICON    = getBase64('icon.png')        || getBase64('favicon.png');
const HERO    = getBase64('login_hero.jpg')  || getBase64('login_desk.png');
const DUO     = getBase64('duolingo.png');
const BEE     = getBase64('beespeaker.png');
const WLINGUA = getBase64('wlingua_brand.png') || getBase64('wlingua.png');

const V = '1.7.1';

// ─── PALETA DE MARCA ────────────────────────────────────────────────────────
// Oscuro premium con acento crimson y detalles violeta
const C = {
  bg:       '#0b0914',
  card:     '#13102000',
  dark:     '#13102a',
  darker:   '#0f0c20',
  border:   'rgba(255,255,255,0.07)',
  crimson:  '#e62e4c',
  violet:   '#9333ea',
  cyan:     '#06b6d4',
  emerald:  '#10b981',
  amber:    '#f59e0b',
  white:    '#ffffff',
  muted:    '#94a3b8',
  subtle:   '#64748b',
};

// ─── SLIDE HELPER ────────────────────────────────────────────────────────────
let slides = [];
function slide(html) { slides.push(html); }

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 1 · PORTADA
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-cover">
  <div class="cover-left">
    ${ICON ? `<div class="cover-logo-wrap"><img src="${ICON}" class="cover-logo-img" alt="Logo"></div>` : '<div class="cover-logo-placeholder">PI</div>'}
    <div class="cover-eyebrow">Plataforma de aprendizaje de inglés</div>
    <h1 class="cover-title">Pronounce<span>It</span></h1>
    <p class="cover-tagline">Aprende inglés de verdad.<br>Con pronunciación perfecta desde el primer día.</p>
    <div class="cover-badges">
      <span class="pill pill-c">📱 Android &amp; Web</span>
      <span class="pill pill-v">🤖 IA integrada</span>
      <span class="pill pill-e">⚡ Offline First</span>
    </div>
    <div class="cover-meta">
      <span>v${V} · Producción</span>
      <span class="dot">·</span>
      <span>Oscar Mangut Dev</span>
    </div>
  </div>
  <div class="cover-right">
    ${HERO ? `<img src="${HERO}" class="cover-hero" alt="App">` : '<div class="cover-hero-ph"></div>'}
    <div class="cover-right-overlay"></div>
    <div class="cover-stat-row">
      <div class="cover-stat"><div class="cover-stat-n">10</div><div class="cover-stat-l">Idiomas</div></div>
      <div class="cover-stat-sep"></div>
      <div class="cover-stat"><div class="cover-stat-n">4</div><div class="cover-stat-l">Módulos</div></div>
      <div class="cover-stat-sep"></div>
      <div class="cover-stat"><div class="cover-stat-n">∞</div><div class="cover-stat-l">Palabras IA</div></div>
    </div>
  </div>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 2 · EL PROBLEMA
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-dark">
  <div class="slide-header">
    <div class="slide-num">01</div>
    <div class="slide-section">El problema</div>
  </div>
  <h2 class="slide-title">El inglés oral es la barrera que nadie resuelve bien</h2>
  <div class="prob-grid">
    <div class="prob-card">
      <div class="prob-icon" style="background:rgba(230,46,76,.15);color:#e62e4c;">🔇</div>
      <div class="prob-body">
        <div class="prob-title">El texto no suena</div>
        <p>El inglés escrito no refleja su pronunciación. <em>Knight, thought, through</em>: tres grafías, ninguna fonética predecible.</p>
      </div>
    </div>
    <div class="prob-card">
      <div class="prob-icon" style="background:rgba(147,51,234,.15);color:#9333ea;">🧠</div>
      <div class="prob-body">
        <div class="prob-title">La memoria sin contexto falla</div>
        <p>Memorizar listas de vocabulario sin pronunciación ni ejemplos provoca una retención menor del 20 % a las 48 horas.</p>
      </div>
    </div>
    <div class="prob-card">
      <div class="prob-icon" style="background:rgba(6,182,212,.15);color:#06b6d4;">📚</div>
      <div class="prob-body">
        <div class="prob-title">Las apps genéricas no se adaptan</div>
        <p>Los hispanohablantes tienen dificultades específicas: schwa, <em>th</em>, vocal corta/larga. Las apps globales no las abordan.</p>
      </div>
    </div>
    <div class="prob-card">
      <div class="prob-icon" style="background:rgba(245,158,11,.15);color:#f59e0b;">📶</div>
      <div class="prob-body">
        <div class="prob-title">Sin internet, sin estudio</div>
        <p>La mayoría de plataformas de idiomas requieren conexión constante, lo que interrumpe el hábito diario de práctica.</p>
      </div>
    </div>
  </div>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 3 · LA SOLUCIÓN
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-crimson-accent">
  <div class="slide-header">
    <div class="slide-num">02</div>
    <div class="slide-section">La solución</div>
  </div>
  <h2 class="slide-title">PronounceIt: tu diccionario personal con <span class="accent-text">fonética dual</span> e IA</h2>
  <div class="sol-layout">
    <div class="sol-left">
      <div class="sol-item">
        <div class="sol-dot" style="background:#e62e4c;"></div>
        <div>
          <strong>Escribe la palabra en inglés</strong>
          <p>La IA analiza el término y rellena automáticamente IPA, guía figurada, traducción, nivel CEFR y ejemplos bilingües.</p>
        </div>
      </div>
      <div class="sol-item">
        <div class="sol-dot" style="background:#9333ea;"></div>
        <div>
          <strong>Practica de 4 formas distintas</strong>
          <p>Flashcards interactivas, tests de vocabulario, test gramatical y entrenador de verbos irregulares.</p>
        </div>
      </div>
      <div class="sol-item">
        <div class="sol-dot" style="background:#06b6d4;"></div>
        <div>
          <strong>Escucha la pronunciación real</strong>
          <p>Motor TTS nativo en Android y Web Speech API en el navegador, con velocidad ajustable.</p>
        </div>
      </div>
      <div class="sol-item">
        <div class="sol-dot" style="background:#10b981;"></div>
        <div>
          <strong>Siempre disponible, con o sin red</strong>
          <p>Todo tu vocabulario vive en tu dispositivo. La nube es una mejora opcional, no un requisito.</p>
        </div>
      </div>
    </div>
    <div class="sol-right">
      <div class="word-card-demo">
        <div class="wc-top">
          <span class="wc-word">throughout</span>
          <span class="wc-play">🔊</span>
        </div>
        <div class="wc-ipa">/θruːˈaʊt/</div>
        <div class="wc-fig">zru-ÁUT · thru-ÁUT</div>
        <div class="wc-tip">💡 La "th" inicial es sorda como la "z" de zapato</div>
        <div class="wc-row">
          <span class="wc-badge wc-pos">Preposición</span>
          <span class="wc-badge wc-b2">B2</span>
        </div>
        <div class="wc-trans">A lo largo de · Por todo</div>
        <div class="wc-ex">"The music echoed <em>throughout</em> the building."</div>
      </div>
    </div>
  </div>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 4 · MÓDULOS
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-dark">
  <div class="slide-header">
    <div class="slide-num">03</div>
    <div class="slide-section">Módulos de la plataforma</div>
  </div>
  <h2 class="slide-title">Cuatro módulos que completan el ciclo de aprendizaje</h2>
  <div class="mod-grid">
    <div class="mod-card" style="border-top:3px solid #e62e4c;">
      <div class="mod-icon">📚</div>
      <div class="mod-name">Vocabulario</div>
      <p>Banco personal ilimitado con IPA, guía figurada, ejemplos bilingües, categorías temáticas y estados de aprendizaje (Nueva → Repaso → Dominada).</p>
      <div class="mod-tags">
        <span class="mtag">IA Gemini</span>
        <span class="mtag">Búsqueda</span>
        <span class="mtag">Categorías</span>
      </div>
    </div>
    <div class="mod-card" style="border-top:3px solid #9333ea;">
      <div class="mod-icon">🎴</div>
      <div class="mod-name">Flashcards</div>
      <p>Tarjetas interactivas basadas en recuerdo activo. Escucha el audio, voltea la tarjeta y autoevalúate. El sistema ajusta la frecuencia de repaso automáticamente.</p>
      <div class="mod-tags">
        <span class="mtag">SRS</span>
        <span class="mtag">Audio</span>
        <span class="mtag">Autoevaluación</span>
      </div>
    </div>
    <div class="mod-card" style="border-top:3px solid #06b6d4;">
      <div class="mod-icon">✍️</div>
      <div class="mod-name">Tests</div>
      <p>Test de vocabulario con opciones múltiples y soporte auditivo, test de categorías gramaticales y resultados detallados guardados en el historial.</p>
      <div class="mod-tags">
        <span class="mtag">Listening</span>
        <span class="mtag">CEFR</span>
        <span class="mtag">Historial</span>
      </div>
    </div>
    <div class="mod-card" style="border-top:3px solid #10b981;">
      <div class="mod-icon">🔤</div>
      <div class="mod-name">Verbos Irregulares</div>
      <p>Entrenador especializado con base de datos propia. Corrección tolerante a erratas (distancia Levenshtein) para no penalizar deslices de teclado.</p>
      <div class="mod-tags">
        <span class="mtag">Nivel B1–C1</span>
        <span class="mtag">Levenshtein</span>
        <span class="mtag">IPA</span>
      </div>
    </div>
  </div>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 5 · IA
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-gradient-violet">
  <div class="slide-header">
    <div class="slide-num">04</div>
    <div class="slide-section">Inteligencia Artificial</div>
  </div>
  <h2 class="slide-title">Gemini 2.5 Flash como lingüista personal</h2>
  <div class="ai-layout">
    <div class="ai-flow">
      <div class="ai-step">
        <div class="ai-step-n">1</div>
        <div class="ai-step-body">
          <strong>Escribe cualquier palabra o frase</strong>
          <p>Modismos, phrasal verbs, términos técnicos o coloquiales: el modelo los conoce todos.</p>
        </div>
      </div>
      <div class="ai-arrow">↓</div>
      <div class="ai-step">
        <div class="ai-step-n">2</div>
        <div class="ai-step-body">
          <strong>Gemini analiza y genera</strong>
          <p>IPA · Guía figurada · Traducción · Categoría gramatical · Nivel CEFR · Ejemplo bilingüe · Consejos fonéticos</p>
        </div>
      </div>
      <div class="ai-arrow">↓</div>
      <div class="ai-step">
        <div class="ai-step-n">3</div>
        <div class="ai-step-body">
          <strong>La ficha se guarda al instante</strong>
          <p>Revísala, edítala si lo deseas y pulsa Guardar. La IA hace el 95 % del trabajo.</p>
        </div>
      </div>
    </div>
    <div class="ai-right">
      <div class="ai-output-card">
        <div class="ao-label">Respuesta de Gemini para "serendipity"</div>
        <div class="ao-row"><span class="ao-key">IPA</span><span class="ao-val">/ˌser.ənˈdɪp.ə.ti/</span></div>
        <div class="ao-row"><span class="ao-key">Guía</span><span class="ao-val">seh-ruhn-DIP-uh-tee</span></div>
        <div class="ao-row"><span class="ao-key">Tipo</span><span class="ao-val">Sustantivo</span></div>
        <div class="ao-row"><span class="ao-key">CEFR</span><span class="ao-val ao-c1">C1</span></div>
        <div class="ao-row"><span class="ao-key">Trad.</span><span class="ao-val">Hallazgo afortunado e inesperado</span></div>
        <div class="ao-row"><span class="ao-key">Ej.</span><span class="ao-val">"Finding this book was pure serendipity."</span></div>
        <div class="ao-row"><span class="ao-key">Tip</span><span class="ao-val">La 'y' final suena como una 'i' corta, no como 'y' española.</span></div>
      </div>
      <div class="ai-note">⏱ Menos de 2 segundos por palabra · Sin límite de consultas con tu propia clave gratuita de Google AI Studio</div>
    </div>
  </div>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 6 · ESTADÍSTICAS Y PROGRESO
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-dark">
  <div class="slide-header">
    <div class="slide-num">05</div>
    <div class="slide-section">Analítica de progreso</div>
  </div>
  <h2 class="slide-title">Mide tu evolución con datos reales</h2>
  <div class="stats-layout">
    <div class="stats-left">
      <div class="kpi-row">
        <div class="kpi-card" style="border-color:#e62e4c;">
          <div class="kpi-n" style="color:#e62e4c;">450</div>
          <div class="kpi-l">Palabras en banco</div>
        </div>
        <div class="kpi-card" style="border-color:#10b981;">
          <div class="kpi-n" style="color:#10b981;">82%</div>
          <div class="kpi-l">Tasa de dominio</div>
        </div>
        <div class="kpi-card" style="border-color:#f59e0b;">
          <div class="kpi-n" style="color:#f59e0b;">21🔥</div>
          <div class="kpi-l">Racha de días</div>
        </div>
      </div>
      <div class="cefr-table">
        <div class="cefr-row"><span class="cefr-chip c-a1">A1</span><div class="cefr-bar"><div class="cefr-fill" style="width:92%;background:#10b981;"></div></div><span class="cefr-n">92</span></div>
        <div class="cefr-row"><span class="cefr-chip c-a2">A2</span><div class="cefr-bar"><div class="cefr-fill" style="width:78%;background:#3b82f6;"></div></div><span class="cefr-n">78</span></div>
        <div class="cefr-row"><span class="cefr-chip c-b1">B1</span><div class="cefr-bar"><div class="cefr-fill" style="width:65%;background:#f59e0b;"></div></div><span class="cefr-n">65</span></div>
        <div class="cefr-row"><span class="cefr-chip c-b2">B2</span><div class="cefr-bar"><div class="cefr-fill" style="width:44%;background:#f97316;"></div></div><span class="cefr-n">44</span></div>
        <div class="cefr-row"><span class="cefr-chip c-c1">C1</span><div class="cefr-bar"><div class="cefr-fill" style="width:22%;background:#ef4444;"></div></div><span class="cefr-n">22</span></div>
      </div>
    </div>
    <div class="stats-right">
      <div class="hist-title">Últimos tests</div>
      <div class="hist-item">
        <div class="hist-type">📚 Vocabulario B2</div>
        <div class="hist-score score-hi">9.0 / 10</div>
        <div class="hist-date">Hoy, 21:04</div>
      </div>
      <div class="hist-item">
        <div class="hist-type">🔤 Verbos Irregulares</div>
        <div class="hist-score score-mid">7.5 / 10</div>
        <div class="hist-date">Ayer, 18:30</div>
      </div>
      <div class="hist-item">
        <div class="hist-type">✍️ Categorías (POS)</div>
        <div class="hist-score score-hi">8.5 / 10</div>
        <div class="hist-date">Hace 2 días</div>
      </div>
      <div class="hist-item">
        <div class="hist-type">📚 Vocabulario A2</div>
        <div class="hist-score score-top">10 / 10</div>
        <div class="hist-date">Hace 3 días</div>
      </div>
    </div>
  </div>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 7 · DISPONIBILIDAD MULTIPLATAFORMA
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-dark">
  <div class="slide-header">
    <div class="slide-num">06</div>
    <div class="slide-section">Disponibilidad</div>
  </div>
  <h2 class="slide-title">Disponible en todos tus dispositivos, siempre</h2>
  <div class="plat-grid">
    <div class="plat-card" style="border-color:#10b981;">
      <div class="plat-icon">📱</div>
      <div class="plat-name">Android APK</div>
      <p>Aplicación nativa React Native. Rendimiento 60 FPS, TTS sin latencia, instalación directa desde GitHub Releases.</p>
      <div class="plat-req">Android 8.0+ · Todos los fabricantes</div>
    </div>
    <div class="plat-card" style="border-color:#3b82f6;">
      <div class="plat-icon">🌐</div>
      <div class="plat-name">Web App (PWA)</div>
      <p>Instalable como app desde cualquier navegador moderno. Sin tienda, sin actualizaciones manuales, siempre en la última versión.</p>
      <div class="plat-req">Chrome · Edge · Firefox · Safari</div>
    </div>
    <div class="plat-card" style="border-color:#9333ea;">
      <div class="plat-icon">🍎</div>
      <div class="plat-name">iOS (Homescreen)</div>
      <p>Añádela a la pantalla de inicio desde Safari en iPhone o iPad. Experiencia de app completa sin pasar por el App Store.</p>
      <div class="plat-req">iOS 14+ · Safari · "Añadir a inicio"</div>
    </div>
    <div class="plat-card" style="border-color:#f59e0b;">
      <div class="plat-icon">⚡</div>
      <div class="plat-name">Offline First</div>
      <p>Vocabulario, flashcards y tests funcionan al 100 % sin internet. La sincronización en la nube es automática al reconectar.</p>
      <div class="plat-req">Firebase · IndexedDB · AsyncStorage</div>
    </div>
  </div>
  <div class="plat-url">
    <span class="plat-url-label">Acceso directo:</span>
    <span class="plat-url-val">pronounceit-sand.vercel.app</span>
  </div>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 8 · COMPARATIVA
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-dark">
  <div class="slide-header">
    <div class="slide-num">07</div>
    <div class="slide-section">Ventaja competitiva</div>
  </div>
  <h2 class="slide-title">Lo que PronounceIt hace distinto</h2>
  <table class="comp-table">
    <thead>
      <tr>
        <th>Funcionalidad</th>
        <th class="th-us">PronounceIt</th>
        <th>Duolingo</th>
        <th>Beespeaker</th>
        <th>Wlingua</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Diccionario personal ilimitado</td>
        <td class="td-yes">✅</td><td class="td-no">❌</td><td class="td-par">⚠️ Limitado</td><td class="td-par">⚠️ Básico</td>
      </tr>
      <tr>
        <td>Transcripción IPA + Guía figurada</td>
        <td class="td-yes">✅</td><td class="td-par">⚠️ Solo IPA</td><td class="td-no">❌</td><td class="td-no">❌</td>
      </tr>
      <tr>
        <td>Enriquecimiento automático con IA</td>
        <td class="td-yes">✅ Gemini</td><td class="td-no">❌</td><td class="td-no">❌</td><td class="td-no">❌</td>
      </tr>
      <tr>
        <td>Consejos fonéticos para hispanohablantes</td>
        <td class="td-yes">✅</td><td class="td-no">❌</td><td class="td-no">❌</td><td class="td-no">❌</td>
      </tr>
      <tr>
        <td>Uso 100 % offline</td>
        <td class="td-yes">✅</td><td class="td-no">❌</td><td class="td-par">⚠️ Parcial</td><td class="td-par">⚠️ Parcial</td>
      </tr>
      <tr>
        <td>Exportación de datos (JSON/CSV)</td>
        <td class="td-yes">✅</td><td class="td-no">❌</td><td class="td-no">❌</td><td class="td-no">❌</td>
      </tr>
      <tr>
        <td>Entrenador de verbos irregulares con IPA</td>
        <td class="td-yes">✅</td><td class="td-par">⚠️ Sin IPA</td><td class="td-no">❌</td><td class="td-par">⚠️ Básico</td>
      </tr>
      <tr>
        <td>10 idiomas de destino</td>
        <td class="td-yes">✅</td><td class="td-yes">✅</td><td class="td-par">⚠️ Limitado</td><td class="td-yes">✅</td>
      </tr>
    </tbody>
  </table>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 9 · CÓMO EMPEZAR
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-crimson-accent">
  <div class="slide-header">
    <div class="slide-num">08</div>
    <div class="slide-section">Cómo empezar</div>
  </div>
  <h2 class="slide-title">En marcha en menos de 2 minutos</h2>
  <div class="how-layout">
    <div class="how-steps">
      <div class="how-step">
        <div class="how-n">1</div>
        <div class="how-body">
          <strong>Abre la app web o instala el APK</strong>
          <p>Visita <em>pronounceit-sand.vercel.app</em> o descarga el APK desde GitHub Releases. Sin registro obligatorio.</p>
        </div>
      </div>
      <div class="how-step">
        <div class="how-n">2</div>
        <div class="how-body">
          <strong>Añade tus primeras palabras</strong>
          <p>Pulsa <em>+ Añadir Palabra</em>, escribe el término en inglés y deja que la IA lo complete todo en menos de 2 segundos.</p>
        </div>
      </div>
      <div class="how-step">
        <div class="how-n">3</div>
        <div class="how-body">
          <strong>Practica 10 minutos al día</strong>
          <p>Repasa con flashcards, haz un test de vocabulario y revisa tus estadísticas. La constancia hace el resto.</p>
        </div>
      </div>
      <div class="how-step">
        <div class="how-n">4</div>
        <div class="how-body">
          <strong>(Opcional) Activa la sincronización en la nube</strong>
          <p>Crea una cuenta con tu correo para sincronizar el vocabulario entre tu móvil y el ordenador en tiempo real.</p>
        </div>
      </div>
    </div>
    <div class="how-right">
      <div class="qr-card">
        <div class="qr-placeholder">
          <div class="qr-icon">🌐</div>
          <div class="qr-text">pronounceit-sand.vercel.app</div>
        </div>
        <div class="qr-caption">Accede ahora desde cualquier navegador</div>
      </div>
      <div class="how-tip">
        <div class="how-tip-icon">💡</div>
        <div>
          <strong>Sin tarjeta de crédito · Sin suscripción</strong><br>
          <span>PronounceIt es gratuita. La clave de Gemini AI también es gratuita en Google AI Studio.</span>
        </div>
      </div>
    </div>
  </div>
</div>
`);

// ────────────────────────────────────────────────────────────────────────────
//  SLIDE 10 · CIERRE
// ────────────────────────────────────────────────────────────────────────────
slide(`
<div class="slide slide-closing">
  <div class="closing-content">
    ${ICON ? `<img src="${ICON}" class="closing-logo" alt="Logo">` : ''}
    <div class="closing-tagline">El idioma que siempre quisiste hablar,<br>con la pronunciación que siempre te faltó.</div>
    <h1 class="closing-brand">Pronounce<span>It</span></h1>
    <div class="closing-links">
      <div class="clink">🌐 pronounceit-sand.vercel.app</div>
      <div class="clink">📱 Android APK · GitHub Releases</div>
      <div class="clink">👤 Desarrollado por Oscar Mangut Dev</div>
    </div>
    <div class="closing-cta">
      ¿Quieres una demo personalizada?
      <span class="closing-cta-email">contacta con Oscar Mangut Dev</span>
    </div>
    <div class="closing-version">PronounceIt v${V} · React Native · Firebase · Gemini AI · 2026</div>
  </div>
  <div class="closing-deco">
    <div class="deco-ring deco-ring-1"></div>
    <div class="deco-ring deco-ring-2"></div>
    <div class="deco-ring deco-ring-3"></div>
  </div>
</div>
`);

// ─── ESTILOS GLOBALES ────────────────────────────────────────────────────────
const CSS = `
@page { size: A4 landscape; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 297mm; height: 210mm; background: #0b0914; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  font-size: 10pt; color: #e2e8f0;
}

/* ─── SLIDE BASE ─────────────────────────────────── */
.slide {
  width: 297mm; height: 210mm;
  padding: 12mm 14mm 10mm 14mm;
  page-break-after: always; break-after: page;
  display: flex; flex-direction: column; overflow: hidden;
  position: relative;
  /* forzar que cada slide ocupe exactamente una página */
  max-height: 210mm;
  box-sizing: border-box;
}
.slide-dark     { background: #0f0c20; }
.slide-crimson-accent { background: #0f0c20; }
.slide-gradient-violet { background: linear-gradient(135deg, #130e24 0%, #1a103a 100%); }
.slide-closing  { background: #0b0914; }

/* ─── HEADER INTERNO ─────────────────────────────── */
.slide-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 8mm;
}
.slide-num {
  font-size: 9pt; font-weight: 800; color: #e62e4c;
  background: rgba(230,46,76,.12); padding: 2px 8px; border-radius: 4px;
  letter-spacing: 1px;
}
.slide-section {
  font-size: 8.5pt; font-weight: 600; color: #64748b;
  text-transform: uppercase; letter-spacing: 1.2px;
}
.slide-title {
  font-size: 18pt; font-weight: 800; color: #fff;
  line-height: 1.15; margin-bottom: 7mm;
}
.accent-text { color: #e62e4c; }

/* ─── PORTADA ─────────────────────────────────────── */
.slide-cover {
  background: linear-gradient(135deg, #0b0914 0%, #13102a 60%, #1a0d2e 100%);
  flex-direction: row; padding: 0;
}
.cover-left {
  width: 55%; padding: 14mm 12mm 14mm 16mm;
  display: flex; flex-direction: column; justify-content: center;
}
.cover-logo-wrap {
  width: 58px; height: 58px; border-radius: 14px;
  background: linear-gradient(135deg,#1c152e,#231b3b);
  box-shadow: 0 8px 24px rgba(147,51,234,.4);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 7mm; overflow: hidden;
}
.cover-logo-img { width: 58px; height: 58px; object-fit: cover; }
.cover-logo-placeholder {
  width: 58px; height: 58px; border-radius: 14px;
  background: #e62e4c; color: #fff; font-size: 22pt; font-weight: 900;
  display: flex; align-items: center; justify-content: center; margin-bottom: 7mm;
}
.cover-eyebrow {
  font-size: 8pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 2px; color: #e62e4c; margin-bottom: 3mm;
}
.cover-title {
  font-size: 36pt; font-weight: 900; color: #fff; line-height: 1; margin-bottom: 4mm;
}
.cover-title span { color: #e62e4c; }
.cover-tagline {
  font-size: 12pt; color: #94a3b8; line-height: 1.45; margin-bottom: 6mm;
}
.cover-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6mm; }
.pill {
  font-size: 7.5pt; font-weight: 700; padding: 4px 11px;
  border-radius: 9999px; text-transform: uppercase; letter-spacing: .4px;
}
.pill-c { background: rgba(230,46,76,.15); color: #e62e4c; border: 1px solid rgba(230,46,76,.3); }
.pill-v { background: rgba(147,51,234,.15); color: #a78bfa; border: 1px solid rgba(147,51,234,.3); }
.pill-e { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.3); }
.cover-meta { font-size: 8pt; color: #475569; display: flex; gap: 6px; }
.dot { color: #475569; }
.cover-right {
  width: 45%; position: relative; overflow: hidden;
}
.cover-right-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to right, #0b0914 0%, transparent 30%);
}
.cover-hero {
  width: 100%; height: 100%; object-fit: cover;
}
.cover-hero-ph { width: 100%; height: 100%; background: linear-gradient(135deg,#1e1240,#2d1b69); }
.cover-stat-row {
  position: absolute; bottom: 10mm; left: 18mm; right: 8mm;
  display: flex; align-items: center; gap: 0;
  background: rgba(11,9,20,.85); border-radius: 10px; padding: 6mm 8mm;
  backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.08);
}
.cover-stat { text-align: center; flex: 1; }
.cover-stat-n { font-size: 20pt; font-weight: 800; color: #e62e4c; line-height: 1; }
.cover-stat-l { font-size: 7.5pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .8px; }
.cover-stat-sep { width: 1px; height: 24px; background: rgba(255,255,255,.1); }

/* ─── PROBLEMA ──────────────────────────────────── */
.prob-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; flex: 1;
}
.prob-card {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 5mm; display: flex; gap: 4mm; align-items: flex-start;
}
.prob-icon {
  width: 36px; height: 36px; border-radius: 8px; font-size: 18pt;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.prob-title { font-size: 10pt; font-weight: 700; color: #fff; margin-bottom: 2mm; }
.prob-card p { font-size: 8.5pt; color: #94a3b8; line-height: 1.4; }

/* ─── SOLUCIÓN ──────────────────────────────────── */
.sol-layout { display: flex; gap: 10mm; flex: 1; align-items: flex-start; }
.sol-left { flex: 1; display: flex; flex-direction: column; gap: 5mm; }
.sol-item { display: flex; gap: 4mm; align-items: flex-start; }
.sol-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.sol-item strong { font-size: 9.5pt; color: #fff; display: block; margin-bottom: 1mm; }
.sol-item p { font-size: 8pt; color: #94a3b8; line-height: 1.4; }
.sol-right { width: 88mm; }

.word-card-demo {
  background: linear-gradient(135deg, #1c1535 0%, #130e24 100%);
  border: 1px solid rgba(230,46,76,.3); border-radius: 12px; padding: 5mm;
}
.wc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2mm; }
.wc-word { font-size: 18pt; font-weight: 800; color: #fff; }
.wc-play { font-size: 14pt; color: #06b6d4; cursor: pointer; }
.wc-ipa { font-family: monospace; font-size: 10pt; color: #38bdf8; margin-bottom: 1mm; }
.wc-fig { font-size: 9pt; font-weight: 700; color: #a78bfa; margin-bottom: 2mm; }
.wc-tip { font-size: 7.8pt; color: #94a3b8; background: rgba(255,255,255,.05); padding: 2mm 3mm; border-radius: 5px; margin-bottom: 2mm; }
.wc-row { display: flex; gap: 4px; margin-bottom: 2mm; }
.wc-badge { font-size: 7pt; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
.wc-pos { background: rgba(147,51,234,.2); color: #c4b5fd; }
.wc-b2 { background: rgba(245,158,11,.2); color: #fbbf24; }
.wc-trans { font-size: 9pt; color: #e2e8f0; margin-bottom: 2mm; }
.wc-ex { font-size: 8pt; color: #64748b; font-style: italic; }

/* ─── MÓDULOS ──────────────────────────────────── */
.mod-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 5mm; flex: 1;
}
.mod-card {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 5mm; display: flex; flex-direction: column; gap: 2mm;
}
.mod-icon { font-size: 20pt; line-height: 1; margin-bottom: 1mm; }
.mod-name { font-size: 10.5pt; font-weight: 800; color: #fff; }
.mod-card p { font-size: 8pt; color: #94a3b8; line-height: 1.4; flex: 1; }
.mod-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2mm; }
.mtag {
  font-size: 6.8pt; font-weight: 700; padding: 2px 6px; border-radius: 3px;
  background: rgba(255,255,255,.07); color: #94a3b8; text-transform: uppercase;
}

/* ─── IA ─────────────────────────────────────────── */
.ai-layout { display: flex; gap: 10mm; flex: 1; }
.ai-flow { display: flex; flex-direction: column; gap: 0; width: 90mm; justify-content: space-evenly; }
.ai-step { display: flex; gap: 4mm; align-items: flex-start; }
.ai-step-n {
  width: 26px; height: 26px; border-radius: 50%; background: #e62e4c;
  color: #fff; font-weight: 700; font-size: 9pt;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ai-step-body strong { font-size: 9.5pt; color: #fff; display: block; margin-bottom: 1mm; }
.ai-step-body p { font-size: 8pt; color: #94a3b8; line-height: 1.4; }
.ai-arrow { font-size: 14pt; color: #e62e4c; text-align: left; padding-left: 11mm; }
.ai-right { flex: 1; display: flex; flex-direction: column; gap: 4mm; justify-content: center; }
.ai-output-card {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px; padding: 4mm;
}
.ao-label { font-size: 7.5pt; color: #64748b; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 3mm; }
.ao-row { display: flex; gap: 3mm; padding: 1.5mm 0; border-bottom: 1px solid rgba(255,255,255,.05); align-items: baseline; }
.ao-key { font-size: 7.5pt; font-weight: 700; color: #e62e4c; width: 35px; flex-shrink: 0; text-transform: uppercase; }
.ao-val { font-size: 8.5pt; color: #e2e8f0; }
.ao-c1 { background: rgba(239,68,68,.2); color: #fca5a5; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; font-weight: 700; }
.ai-note { font-size: 7.5pt; color: #64748b; text-align: center; padding: 2mm; background: rgba(255,255,255,.03); border-radius: 6px; }

/* ─── ESTADÍSTICAS ──────────────────────────────── */
.stats-layout { display: flex; gap: 8mm; flex: 1; }
.stats-left { flex: 1; display: flex; flex-direction: column; gap: 5mm; }
.kpi-row { display: flex; gap: 5mm; }
.kpi-card {
  flex: 1; background: rgba(255,255,255,.04); border: 1px solid transparent;
  border-radius: 9px; padding: 4mm; text-align: center; border-left-width: 3px !important;
}
.kpi-n { font-size: 22pt; font-weight: 800; line-height: 1; }
.kpi-l { font-size: 8pt; color: #64748b; margin-top: 1mm; }
.cefr-table { background: rgba(255,255,255,.04); border-radius: 8px; padding: 4mm; display: flex; flex-direction: column; gap: 3mm; }
.cefr-row { display: flex; align-items: center; gap: 3mm; }
.cefr-chip { font-size: 7pt; font-weight: 700; padding: 2px 6px; border-radius: 3px; width: 26px; text-align: center; }
.c-a1 { background: #d1fae5; color: #065f46; }
.c-a2 { background: #dbeafe; color: #1d4ed8; }
.c-b1 { background: #fef3c7; color: #b45309; }
.c-b2 { background: #ffedd5; color: #c2410c; }
.c-c1 { background: #fee2e2; color: #b91c1c; }
.cefr-bar { flex: 1; height: 7px; background: rgba(255,255,255,.08); border-radius: 9999px; overflow: hidden; }
.cefr-fill { height: 100%; border-radius: 9999px; }
.cefr-n { font-size: 8pt; color: #64748b; width: 24px; text-align: right; }
.stats-right { width: 95mm; }
.hist-title { font-size: 9pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 3mm; }
.hist-item {
  display: flex; align-items: center; gap: 3mm; padding: 3mm;
  background: rgba(255,255,255,.04); border-radius: 7px; margin-bottom: 2mm;
  border: 1px solid rgba(255,255,255,.06);
}
.hist-type { flex: 1; font-size: 8.5pt; color: #e2e8f0; }
.hist-score { font-size: 9pt; font-weight: 700; padding: 2px 8px; border-radius: 5px; }
.score-top  { background: rgba(16,185,129,.2); color: #34d399; }
.score-hi   { background: rgba(99,102,241,.2); color: #a5b4fc; }
.score-mid  { background: rgba(245,158,11,.2); color: #fbbf24; }
.hist-date  { font-size: 7.5pt; color: #475569; width: 52px; text-align: right; }

/* ─── PLATAFORMAS ────────────────────────────────── */
.plat-grid {
  display: grid; grid-template-columns: repeat(4,1fr); gap: 4mm;
  flex: 1; min-height: 0;
}
.plat-card {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 4mm;
  display: flex; flex-direction: column; gap: 1.5mm;
  border-top: 3px solid transparent;
  overflow: hidden;
}
.plat-icon { font-size: 18pt; line-height: 1.2; }
.plat-name { font-size: 10pt; font-weight: 700; color: #fff; }
.plat-card p { font-size: 7.8pt; color: #94a3b8; line-height: 1.38; flex: 1; }
.plat-req { font-size: 7pt; color: #475569; margin-top: 1mm; }
.plat-url {
  margin-top: 3mm; padding: 2.5mm 4mm; background: rgba(6,182,212,.1);
  border-radius: 7px; border: 1px solid rgba(6,182,212,.25);
  display: flex; gap: 3mm; align-items: center; flex-shrink: 0;
}
.plat-url-label { font-size: 7.8pt; color: #64748b; font-weight: 600; }
.plat-url-val { font-size: 9pt; font-weight: 700; color: #06b6d4; }

/* ─── COMPARATIVA ─────────────────────────────────── */
.comp-table { width: 100%; border-collapse: collapse; font-size: 8.2pt; flex: 1; }
.comp-table th { background: rgba(255,255,255,.06); color: #94a3b8; font-weight: 700; padding: 3mm 4mm; text-align: center; border: 1px solid rgba(255,255,255,.07); font-size: 7.8pt; text-transform: uppercase; letter-spacing: .5px; }
.th-us { background: rgba(230,46,76,.18) !important; color: #fca5a5 !important; }
.comp-table td { padding: 2.5mm 4mm; border: 1px solid rgba(255,255,255,.05); text-align: center; color: #94a3b8; }
.comp-table td:first-child { text-align: left; color: #e2e8f0; font-weight: 500; }
.td-yes  { color: #34d399 !important; font-weight: 700; }
.td-no   { color: #f87171 !important; }
.td-par  { color: #fbbf24 !important; }
.comp-table tr:nth-child(even) td { background: rgba(255,255,255,.02); }

/* ─── CÓMO EMPEZAR ─────────────────────────────────── */
.how-layout { display: flex; gap: 10mm; flex: 1; align-items: flex-start; }
.how-steps { flex: 1; display: flex; flex-direction: column; gap: 5mm; }
.how-step { display: flex; gap: 4mm; align-items: flex-start; }
.how-n {
  width: 28px; height: 28px; border-radius: 50%; background: #e62e4c;
  color: #fff; font-weight: 800; font-size: 10pt;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.how-body strong { font-size: 9.5pt; color: #fff; display: block; margin-bottom: 1mm; }
.how-body p { font-size: 8pt; color: #94a3b8; line-height: 1.4; }
.how-right { width: 85mm; display: flex; flex-direction: column; gap: 5mm; }
.qr-card {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px; padding: 5mm; text-align: center;
}
.qr-placeholder {
  width: 100%; padding: 8mm; display: flex; flex-direction: column; align-items: center;
  gap: 3mm;
}
.qr-icon { font-size: 28pt; }
.qr-text { font-size: 10pt; font-weight: 700; color: #06b6d4; }
.qr-caption { font-size: 7.5pt; color: #64748b; }
.how-tip {
  background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.2);
  border-radius: 8px; padding: 4mm; display: flex; gap: 3mm; align-items: flex-start;
}
.how-tip-icon { font-size: 16pt; line-height: 1; }
.how-tip strong { font-size: 9pt; color: #34d399; display: block; margin-bottom: 1mm; }
.how-tip span { font-size: 8pt; color: #6ee7b7; }

/* ─── CIERRE ─────────────────────────────────────── */
.slide-closing {
  align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, #1a0d2e 0%, #0b0914 70%);
}
.closing-content { text-align: center; z-index: 2; position: relative; }
.closing-logo { width: 72px; height: 72px; border-radius: 16px; margin-bottom: 5mm; box-shadow: 0 10px 30px rgba(147,51,234,.5); }
.closing-tagline { font-size: 11pt; color: #94a3b8; line-height: 1.5; margin-bottom: 4mm; }
.closing-brand { font-size: 40pt; font-weight: 900; color: #fff; line-height: 1; margin-bottom: 7mm; }
.closing-brand span { color: #e62e4c; }
.closing-links { display: flex; justify-content: center; gap: 6mm; margin-bottom: 7mm; }
.clink { font-size: 9pt; color: #94a3b8; }
.closing-cta {
  font-size: 10pt; color: #e2e8f0; margin-bottom: 5mm;
  background: rgba(230,46,76,.12); border: 1px solid rgba(230,46,76,.25);
  padding: 3mm 8mm; border-radius: 9999px; display: inline-block;
}
.closing-cta-email { color: #e62e4c; font-weight: 700; margin-left: 2mm; }
.closing-version { font-size: 7.5pt; color: #334155; }
.deco-ring {
  position: absolute; border-radius: 50%; border: 1px solid rgba(147,51,234,.1);
  top: 50%; left: 50%; transform: translate(-50%,-50%);
}
.deco-ring-1 { width: 120mm; height: 120mm; }
.deco-ring-2 { width: 160mm; height: 160mm; }
.deco-ring-3 { width: 200mm; height: 200mm; }
.closing-content { z-index: 5; }
`;

// ─── ENSAMBLADO HTML FINAL ───────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>PronounceIt — Presentación para Clientes</title>
<style>${CSS}</style>
</head>
<body>${slides.join('\n')}</body>
</html>`;

// ─── ESCRITURA Y RENDERIZADO ─────────────────────────────────────────────────
const htmlPath = path.join(rootDir, 'presentacion_pronounceit.html');
const pdfPath  = path.join(rootDir, 'presentacion_pronounceit.pdf');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML generado:', htmlPath);

const PORT   = 19824;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Servidor temporal en http://127.0.0.1:' + PORT);

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const browser = candidates.find(p => fs.existsSync(p));
  if (!browser) { console.error('No se encontró Chrome ni Edge.'); server.close(); process.exit(1); }

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=10000',
    '--no-pdf-header-footer',
    '--print-to-pdf=' + pdfPath,
    'http://127.0.0.1:' + PORT + '/',
  ];

  console.log('Renderizando con:', browser);
  const child = spawn(browser, args, { stdio: 'pipe' });
  let stderr = '';
  child.stderr && child.stderr.on('data', d => { stderr += d.toString(); });

  child.on('exit', code => {
    server.close();
    if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 1024) {
      const kb = (fs.statSync(pdfPath).size / 1024).toFixed(1);
      console.log('\n✅ Presentación PDF generada.');
      console.log('   Ruta  :', pdfPath);
      console.log('   Tamaño:', kb, 'KB');
    } else {
      console.error('❌ Fallo al generar el PDF (código ' + code + ').');
      if (stderr) console.error(stderr.slice(0, 600));
      process.exit(1);
    }
  });
});
