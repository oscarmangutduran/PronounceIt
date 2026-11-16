'use strict';
const PDFDocument = require('./server/node_modules/pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'Manual_Tecnico_PronounceIt.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });
const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);

// ── Paleta de colores ──────────────────────────────────────────────────────────
const C = {
  primary:   '#1A56DB',
  accent:    '#7E3AF2',
  success:   '#057A55',
  warning:   '#B45309',
  danger:    '#C81E1E',
  dark:      '#111827',
  mid:       '#374151',
  light:     '#6B7280',
  pale:      '#F3F4F6',
  white:     '#FFFFFF',
  border:    '#D1D5DB',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function newPage() {
  doc.addPage();
  // Cabecera fina
  doc.rect(0, 0, doc.page.width, 6).fill(C.primary);
  // Pie de página
  doc.fontSize(8).fillColor(C.light)
     .text('PronounceIt v1.7.1 — Documentación Técnica', 50, doc.page.height - 30, { align: 'left' })
     .text(`Página ${doc.bufferedPageRange().start + doc.bufferedPageRange().count}`, 0, doc.page.height - 30, { align: 'right', width: doc.page.width - 50 });
  doc.y = 30;
  doc.fillColor(C.dark);
}

function h1(text) {
  doc.moveDown(0.5);
  doc.fontSize(22).fillColor(C.primary).font('Helvetica-Bold').text(text);
  doc.moveDown(0.15);
  doc.rect(50, doc.y, doc.page.width - 100, 2).fill(C.primary);
  doc.moveDown(0.6);
  doc.font('Helvetica').fillColor(C.dark);
}

function h2(text) {
  doc.moveDown(0.6);
  doc.fontSize(14).fillColor(C.accent).font('Helvetica-Bold').text(text);
  doc.moveDown(0.3);
  doc.font('Helvetica').fillColor(C.dark);
}

function h3(text) {
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor(C.mid).font('Helvetica-Bold').text(text);
  doc.moveDown(0.2);
  doc.font('Helvetica').fillColor(C.dark);
}

function body(text, opts) {
  doc.fontSize(10).fillColor(C.dark).font('Helvetica').text(text, opts || {});
  doc.moveDown(0.3);
}

function bullet(items) {
  items.forEach(item => {
    const x = doc.x;
    doc.fontSize(10).fillColor(C.primary).text('•', x, doc.y, { continued: true, width: 12 });
    doc.fillColor(C.dark).text('  ' + item, { width: doc.page.width - 130 });
  });
  doc.moveDown(0.2);
}

function badge(text, color, x, y) {
  const w = doc.widthOfString(text) + 16;
  doc.roundedRect(x, y, w, 16, 4).fill(color);
  doc.fontSize(8).fillColor(C.white).font('Helvetica-Bold').text(text, x + 8, y + 4, { lineBreak: false });
  doc.font('Helvetica').fillColor(C.dark);
  return w;
}

function infoBox(title, text, color) {
  const startY = doc.y;
  const w = doc.page.width - 100;
  doc.rect(50, startY, 4, 1).fill(color); // placeholder height, drawn after
  doc.fontSize(10).font('Helvetica-Bold').fillColor(color)
     .text(title, 62, startY + 4, { width: w - 20 });
  doc.font('Helvetica').fillColor(C.mid)
     .text(text, 62, doc.y + 2, { width: w - 20 });
  const endY = doc.y + 6;
  const h = endY - startY;
  doc.rect(50, startY, w, h).stroke(color);
  doc.rect(50, startY, 4, h).fill(color);
  doc.y = endY + 10;
  doc.fillColor(C.dark);
}

function table(headers, rows, colWidths) {
  const startX = 50;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const rowH = 20;
  let y = doc.y;

  // Header row
  doc.rect(startX, y, totalW, rowH).fill(C.primary);
  let x = startX;
  headers.forEach((h, i) => {
    doc.fontSize(9).fillColor(C.white).font('Helvetica-Bold')
       .text(h, x + 6, y + 6, { width: colWidths[i] - 10, lineBreak: false });
    x += colWidths[i];
  });
  y += rowH;

  // Data rows
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? C.pale : C.white;
    doc.rect(startX, y, totalW, rowH).fill(bg);
    // border
    doc.rect(startX, y, totalW, rowH).stroke(C.border);
    x = startX;
    row.forEach((cell, ci) => {
      doc.fontSize(9).fillColor(C.dark).font('Helvetica')
         .text(String(cell), x + 6, y + 6, { width: colWidths[ci] - 10, lineBreak: false });
      x += colWidths[ci];
    });
    y += rowH;
  });
  doc.y = y + 10;
  doc.fillColor(C.dark);
}

function codeBlock(code) {
  const lines = code.split('\n');
  const lineH = 13;
  const h = lines.length * lineH + 16;
  doc.rect(50, doc.y, doc.page.width - 100, h).fill('#1E1E2E');
  let cy = doc.y + 8;
  lines.forEach(line => {
    doc.fontSize(8).fillColor('#A6E3A1').font('Courier').text(line, 62, cy, { lineBreak: false });
    cy += lineH;
  });
  doc.y = doc.y + h + 8;
  doc.font('Helvetica').fillColor(C.dark);
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTADA
// ══════════════════════════════════════════════════════════════════════════════
doc.addPage();
// Fondo superior degradado simulado
doc.rect(0, 0, doc.page.width, 280).fill(C.primary);
doc.rect(0, 240, doc.page.width, 60).fill(C.accent);
doc.rect(0, 280, doc.page.width, doc.page.height - 280).fill(C.pale);

// Logo / ícono simulado
doc.circle(doc.page.width / 2, 100, 50).fill(C.white);
doc.fontSize(28).fillColor(C.primary).font('Helvetica-Bold')
   .text('PI', 0, 86, { align: 'center' });

// Título
doc.fontSize(32).fillColor(C.white).font('Helvetica-Bold')
   .text('PronounceIt', 50, 170, { align: 'center' });
doc.fontSize(13).fillColor('#BFD7FF').font('Helvetica')
   .text('Plataforma inteligente de aprendizaje de pronunciación en inglés', 50, 210, { align: 'center' });

// Versión badge
doc.roundedRect(doc.page.width / 2 - 40, 255, 80, 20, 10).fill(C.white);
doc.fontSize(10).fillColor(C.accent).font('Helvetica-Bold')
   .text('v 1.7.1', 0, 261, { align: 'center' });

// Metadatos
doc.fontSize(10).fillColor(C.mid).font('Helvetica')
   .text('Documentación Técnica y Funcional', 50, 310, { align: 'center' })
   .text('Plataformas: Android APK · Web (PWA) · iOS', 50, 328, { align: 'center' })
   .text(`Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 346, { align: 'center' });

// Tags
const tags = ['React Native', 'Firebase', 'Gemini AI', 'Express', 'TypeScript'];
let tx = (doc.page.width - tags.length * 80) / 2;
tags.forEach(tag => {
  doc.roundedRect(tx, 380, 74, 20, 10).stroke(C.primary);
  doc.fontSize(9).fillColor(C.primary).font('Helvetica').text(tag, tx, 386, { width: 74, align: 'center', lineBreak: false });
  tx += 80;
});

// Pie de portada
doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill(C.dark);
doc.fontSize(9).fillColor(C.light).font('Helvetica')
   .text('© 2024 Oscar Mangut — PronounceIt. Todos los derechos reservados.', 50, doc.page.height - 32, { align: 'center' });

// ══════════════════════════════════════════════════════════════════════════════
// ÍNDICE
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('Índice de Contenidos');

const tocItems = [
  ['1.', 'Visión General de la Aplicación', '3'],
  ['2.', 'Arquitectura del Sistema', '4'],
  ['3.', 'Stack Tecnológico', '5'],
  ['4.', 'Módulos Funcionales', '6'],
  ['5.', 'Autenticación y Gestión de Usuarios', '8'],
  ['6.', 'Firebase y Firestore', '9'],
  ['7.', 'Cloud Functions e IA (Gemini)', '10'],
  ['8.', 'Backend Express', '11'],
  ['9.', 'Despliegue y Plataformas', '12'],
  ['10.', 'Seguridad', '13'],
];

tocItems.forEach(([num, title, page]) => {
  const y = doc.y;
  doc.fontSize(11).fillColor(C.primary).font('Helvetica-Bold').text(num, 50, y, { width: 25, lineBreak: false });
  doc.fillColor(C.dark).font('Helvetica').text(title, 78, y, { width: 350, lineBreak: false });
  // dots
  const dotsX = 440;
  doc.fillColor(C.border).text('· · · · · · · · · · · · · · · · · · · ·', dotsX, y, { width: 60, lineBreak: false });
  doc.fillColor(C.mid).font('Helvetica-Bold').text(page, 505, y, { width: 30, align: 'right', lineBreak: false });
  doc.moveDown(0.6);
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. VISIÓN GENERAL
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('1. Visión General de la Aplicación');

body('PronounceIt es una plataforma educativa multiplataforma orientada al aprendizaje del inglés para hispanohablantes. Combina un vocabulario personal inteligente, retroalimentación de pronunciación, tests interactivos y enriquecimiento automático por IA para ofrecer una experiencia de aprendizaje completa y adaptativa.');

h2('¿Qué puede hacer el usuario?');
bullet([
  'Registrar y organizar su vocabulario personal en inglés con categorías y subcategorías.',
  'Ver la transcripción fonética IPA, ejemplos de uso y traducción de cada palabra.',
  'Enriquecer palabras automáticamente con IA (Google Gemini 2.5 Flash).',
  'Practicar con flashcards de repetición espaciada (sistema SRS).',
  'Realizar tests de vocabulario y verbos irregulares con puntuación CEFR.',
  'Consultar su historial de exámenes y progreso.',
  'Usar la app sin conexión (modo offline) con sincronización automática al reconectarse.',
  'Acceder desde Android (APK), navegador web (PWA) o iOS.',
]);

h2('Plataformas soportadas');
const platforms = [
  ['Android', 'APK nativo (Expo prebuild + Gradle)', 'com.oscarmangut.pronounceit', '✓'],
  ['Web / PWA', 'Expo web + Vite, desplegada en Vercel', 'pronounceit-sand.vercel.app', '✓'],
  ['iOS', 'Expo compatible (requiere Apple Developer)', 'En desarrollo', '~'],
];
table(['Plataforma', 'Tecnología', 'Identificador / URL', 'Disponible'], platforms, [100, 180, 180, 55]);

infoBox('Versión actual', 'v1.7.1 — La última versión estable incluye logo unificado, corrección de UI en mobile, workflow de CI/CD para APK automático y soporte para múltiples idiomas de aprendizaje.', C.success);

// ══════════════════════════════════════════════════════════════════════════════
// 2. ARQUITECTURA
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('2. Arquitectura del Sistema');

body('PronounceIt sigue una arquitectura de tres capas desacopladas que permite escalar cada componente de forma independiente:');

h2('Diagrama de capas');
// Diagrama ASCII en caja visual
const diagY = doc.y;
const diagW = doc.page.width - 100;

// Capa cliente
doc.rect(50, diagY, diagW, 40).fill('#EFF6FF').stroke(C.primary);
doc.fontSize(10).fillColor(C.primary).font('Helvetica-Bold')
   .text('CAPA CLIENTE  —  React Native / Expo (Android · Web · iOS)', 60, diagY + 8);
doc.fontSize(9).fillColor(C.mid).font('Helvetica')
   .text('firebaseClient.ts · functionsService.ts · apiClient.ts · vocabularyStore.ts', 60, diagY + 22);

// Flecha
doc.fontSize(14).fillColor(C.accent).text('⬇  HTTPS / Firebase SDK  ⬇', 50, diagY + 50, { align: 'center', width: diagW });

// Capa middle
const m2y = diagY + 80;
doc.rect(50, m2y, diagW / 2 - 5, 50).fill('#F3F0FF').stroke(C.accent);
doc.fontSize(10).fillColor(C.accent).font('Helvetica-Bold').text('Firebase Cloud Functions v2', 58, m2y + 8);
doc.fontSize(9).fillColor(C.mid).font('Helvetica').text('enrichVocabularyWithAi · deleteUserAccount\nGemini 2.5 Flash · Secret Manager', 58, m2y + 22);

doc.rect(50 + diagW / 2 + 5, m2y, diagW / 2 - 5, 50).fill('#ECFDF5').stroke(C.success);
doc.fontSize(10).fillColor(C.success).font('Helvetica-Bold').text('Backend Express (Node.js)', 58 + diagW / 2 + 5, m2y + 8);
doc.fontSize(9).fillColor(C.mid).font('Helvetica').text('auth · words · tests · discord · updates\nJWT · db.json · Nodemailer · Discord.js', 58 + diagW / 2 + 5, m2y + 22);

// Flecha 2
doc.fontSize(14).fillColor(C.mid).text('⬇  Admin SDK / Firebase Auth  ⬇', 50, m2y + 60, { align: 'center', width: diagW });

// Capa datos
const d3y = m2y + 90;
doc.rect(50, d3y, diagW / 3 - 5, 40).fill('#FFF7ED').stroke(C.warning);
doc.fontSize(9).fillColor(C.warning).font('Helvetica-Bold').text('Firestore', 58, d3y + 8);
doc.fontSize(8).fillColor(C.mid).font('Helvetica').text('users · words · accounts\ntest_history', 58, d3y + 20);

doc.rect(50 + diagW / 3 + 5, d3y, diagW / 3 - 10, 40).fill('#FFF1F2').stroke(C.danger);
doc.fontSize(9).fillColor(C.danger).font('Helvetica-Bold').text('Firebase Auth', 58 + diagW / 3 + 5, d3y + 8);
doc.fontSize(8).fillColor(C.mid).font('Helvetica').text('Email/password\nUID tokens', 58 + diagW / 3 + 5, d3y + 20);

doc.rect(50 + 2 * diagW / 3 + 10, d3y, diagW / 3 - 10, 40).fill('#F0FDF4').stroke(C.success);
doc.fontSize(9).fillColor(C.success).font('Helvetica-Bold').text('Secret Manager', 58 + 2 * diagW / 3 + 10, d3y + 8);
doc.fontSize(8).fillColor(C.mid).font('Helvetica').text('GEMINI_API_KEY\n(solo servidor)', 58 + 2 * diagW / 3 + 10, d3y + 20);

doc.y = d3y + 60;

h2('Patrón de comunicación');
bullet([
  'El cliente móvil/web se comunica con Firebase directamente usando el SDK público (no necesita pasar por el backend Express para datos en tiempo real).',
  'Operaciones que requieren privilegios elevados (IA, eliminación de cuentas) se delegan a Cloud Functions, que son el único canal con acceso al Admin SDK y los secretos.',
  'El backend Express gestiona la autenticación JWT propia, los reportes, el bot de Discord y las notificaciones de actualizaciones.',
  'Las reglas de Firestore (firestore.rules) garantizan que cada usuario solo acceda a sus propios datos, incluso si el cliente fuera comprometido.',
]);

// ══════════════════════════════════════════════════════════════════════════════
// 3. STACK TECNOLÓGICO
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('3. Stack Tecnológico');

h2('Frontend / Cliente móvil');
table(
  ['Tecnología', 'Versión', 'Rol'],
  [
    ['React Native (Expo)', '~57.0 / RN 0.86', 'Framework multiplataforma (Android, iOS, Web)'],
    ['React', '19.2', 'Librería de UI'],
    ['TypeScript', '~5.3', 'Tipado estático en todo el proyecto'],
    ['Firebase JS SDK', '^12.19', 'Auth, Firestore, Cloud Functions callable'],
    ['Vite', '^6.3', 'Bundler y servidor de desarrollo web'],
    ['Expo EAS', 'latest', 'Build service para APK de producción'],
    ['NativeWind / Tailwind', 'Compatible', 'Estilos utilitarios'],
  ],
  [160, 110, 225]
);

h2('Backend (servidor Express)');
table(
  ['Tecnología', 'Versión', 'Rol'],
  [
    ['Node.js', '^20', 'Runtime del servidor'],
    ['Express', 'latest', 'Framework HTTP REST API'],
    ['TypeScript', '~5.3', 'Tipado del servidor'],
    ['jsonwebtoken', 'latest', 'Autenticación JWT'],
    ['bcryptjs', 'latest', 'Hash de contraseñas'],
    ['Nodemailer', 'latest', 'Envío de emails SMTP (Strato)'],
    ['Discord.js', 'latest', 'Bot de Discord para notificaciones'],
    ['pdfkit / exceljs', 'latest', 'Generación de reportes PDF y Excel'],
    ['lowdb / db.json', 'custom', 'Base de datos JSON persistente'],
  ],
  [160, 110, 225]
);

h2('Cloud Functions (Firebase v2)');
table(
  ['Tecnología', 'Versión', 'Rol'],
  [
    ['Firebase Functions', '^5.0', 'Hosting serverless de funciones'],
    ['Firebase Admin SDK', '^12.0', 'Acceso privilegiado a Firestore y Auth'],
    ['Google Gemini 2.5 Flash', 'REST API', 'Enriquecimiento de vocabulario con IA'],
    ['Google Cloud Secret Manager', 'nativo', 'Gestión segura de GEMINI_API_KEY'],
  ],
  [180, 110, 205]
);

h2('Infraestructura y despliegue');
table(
  ['Servicio', 'Uso'],
  [
    ['Vercel', 'Hosting web cliente + API serverless (producción)'],
    ['Render', 'Hosting alternativo del backend Express'],
    ['Firebase Hosting', 'Opcional para distribución web'],
    ['GitHub Actions', 'CI/CD: compilación y publicación automática del APK'],
    ['Docker', 'Contenedores para desarrollo local (docker-compose)'],
  ],
  [140, 355]
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. MÓDULOS FUNCIONALES
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('4. Módulos Funcionales');

h2('4.1 Vocabulario Personal');
body('El núcleo de la aplicación. Permite al usuario construir su propio diccionario personal en inglés con metadatos ricos por cada entrada.');
bullet([
  'Cada palabra incluye: transcripción IPA, guía fonética simplificada, traducción al español, definición, ejemplos en inglés y español, parte del discurso, nivel CEFR (A1–C2) y estado de aprendizaje.',
  'Las palabras se organizan en categorías y subcategorías personalizables.',
  'El estado de cada palabra puede ser: "aprendiendo", "dominada" o "por revisar".',
  'Soporte para marcar favoritas y filtrar por múltiples criterios.',
  'Sincronización en tiempo real entre dispositivos mediante Firestore onSnapshot.',
  'Importación y exportación de vocabulario en formato CSV.',
]);

h2('4.2 Enriquecimiento por IA');
body('Cuando el usuario añade una palabra nueva, puede invocar la función de IA para rellenar automáticamente todos sus campos lingüísticos.');
bullet([
  'Utiliza Google Gemini 2.5 Flash vía Firebase Cloud Function (nunca desde el cliente directamente).',
  'Genera: transcripción IPA, traducción, parte del discurso, ejemplos de uso, consejos de pronunciación específicos para hispanohablantes y nivel CEFR.',
  'La API key de Gemini nunca sale del servidor — se gestiona con Google Cloud Secret Manager.',
  'Requiere sesión activa; peticiones no autenticadas son rechazadas con error unauthenticated.',
]);

infoBox('Flujo de enriquecimiento', 'Usuario escribe palabra → cliente llama enrichVocabularySecurely() → Firebase SDK envía token de auth + payload → Cloud Function valida auth → llama Gemini API con clave secreta → devuelve datos estructurados → cliente rellena formulario automáticamente.', C.accent);

h2('4.3 Flashcards con Repetición Espaciada (SRS)');
body('Sistema de tarjetas de memorización que adapta la frecuencia de revisión según el rendimiento del usuario, basado en el algoritmo SM-2 simplificado.');
bullet([
  'Cada palabra tiene un intervalo de revisión en días (srsIntervalDays) y una fecha de última revisión.',
  'Las palabras se presentan priorizando las que llevan más tiempo sin revisar.',
  'El usuario marca si recordó la palabra correctamente, ajustando el intervalo automáticamente.',
  'Modo disponible tanto en modo conectado como offline.',
]);

h2('4.4 Tests Interactivos');
body('Módulo de evaluación con dos tipos de tests y sistema de puntuación adaptada al CEFR.');
bullet([
  'Test de Vocabulario: preguntas de opción múltiple basadas en las palabras del usuario.',
  'Test de Verbos Irregulares: cobertura de los 200+ verbos irregulares más usados en inglés.',
  'Puntuación sobre 10 con etiqueta CEFR (A1 a C2) basada en el porcentaje de aciertos.',
  'Historial completo de todos los tests realizados con fecha, tipo y puntuación.',
  'Los resultados se sincronizan en Firestore bajo la subcolección test_history del usuario.',
]);

h2('4.5 Pronunciación y Guía Fonética');
bullet([
  'Cada palabra muestra su transcripción IPA estándar (/ˈwɔːtər/).',
  'Guía fonética simplificada para hispanohablantes (ej: "uó-ter").',
  'Notas de pronunciación con consejos específicos sobre sonidos difíciles.',
  'Integración con la API de Text-to-Speech del dispositivo para escuchar la pronunciación real.',
]);

h2('4.6 Modo Offline');
bullet([
  'La app es completamente funcional sin conexión a internet.',
  'Los datos se persisten localmente en localStorage / AsyncStorage.',
  'Al recuperar la conexión, se sincronizan automáticamente con Firestore.',
  'El usuario puede iniciar sesión offline con su último perfil guardado.',
]);

// ══════════════════════════════════════════════════════════════════════════════
// 5. AUTENTICACIÓN Y GESTIÓN DE USUARIOS
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('5. Autenticación y Gestión de Usuarios');

body('PronounceIt implementa un sistema de autenticación híbrido que combina Firebase Auth con una capa de compatibilidad propia, permitiendo el funcionamiento tanto online como offline.');

h2('Flujo de autenticación por capas');
const authSteps = [
  ['1ª', 'Firestore /accounts', 'Búsqueda directa por email/username en la nube', 'Online'],
  ['2ª', 'Cache local', 'localStorage / AsyncStorage del dispositivo', 'Offline'],
  ['3ª', 'Backend Express', 'API REST con JWT (fallback legacy)', 'Online'],
  ['4ª', 'Auto-provisioning', 'Creación automática con contraseña temporal 12345', 'Online'],
];
table(['Prioridad', 'Fuente', 'Descripción', 'Requiere'], authSteps, [60, 130, 220, 85]);

h2('Registro de usuarios');
bullet([
  'El usuario proporciona email, username y opcionalmente una contraseña personalizada.',
  'Si no proporciona contraseña, se asigna la temporal "12345" con flag must_change_password = true.',
  'La cuenta se crea simultáneamente en Firestore (/accounts y /users) y en el backend Express.',
  'Se genera un ID único con formato usr-{base36timestamp}-{random5}.',
  'El backend Express envía un email de bienvenida via SMTP (Strato).',
]);

h2('Datos del perfil de usuario');
table(
  ['Campo', 'Tipo', 'Descripción'],
  [
    ['id', 'string', 'Identificador único (Firebase UID o generado)'],
    ['email', 'string', 'Correo electrónico (clave de búsqueda principal)'],
    ['username', 'string', 'Nombre de usuario (clave secundaria)'],
    ['full_name', 'string', 'Nombre completo visible'],
    ['avatar_url', 'string?', 'URL de foto o base64 (guardado en IndexedDB)'],
    ['must_change_password', 'boolean', 'Fuerza cambio en el próximo login'],
    ['native_language', 'string', 'Idioma nativo del usuario (ej: "es")'],
    ['target_language', 'string', 'Idioma que está aprendiendo (ej: "en")'],
    ['learning_languages', 'string[]', 'Lista de todos los idiomas en aprendizaje'],
    ['role', 'string', '"user" o "admin"'],
  ],
  [140, 100, 255]
);

h2('Gestión de avatares');
body('Los avatares siguen una estrategia de almacenamiento en múltiples capas para garantizar que nunca se pierdan:');
bullet([
  'Prioridad 1: IndexedDB (persistente, mayor capacidad)',
  'Prioridad 2: localStorage con claves por userId, username y email',
  'Prioridad 3: Campo avatar_url en Firestore /users',
  'Firebase Auth solo almacena URLs HTTP (no acepta base64)',
]);

// ══════════════════════════════════════════════════════════════════════════════
// 6. FIREBASE Y FIRESTORE
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('6. Firebase y Firestore');

h2('Proyecto Firebase');
table(
  ['Parámetro', 'Valor'],
  [
    ['Project ID', 'pronounceit-56fe6'],
    ['Auth Domain', 'pronounceit-56fe6.firebaseapp.com'],
    ['Storage Bucket', 'pronounceit-56fe6.firebasestorage.app'],
    ['Region Functions', 'us-central1'],
    ['Sender ID', '535336392107'],
  ],
  [160, 335]
);

h2('Estructura de colecciones Firestore');
table(
  ['Colección', 'Documento', 'Acceso', 'Descripción'],
  [
    ['/users/{uid}', 'Perfil del usuario', 'Solo propietario', 'Datos de perfil, categorías, idiomas'],
    ['/users/{uid}/words/{wordId}', 'Palabra', 'Solo propietario', 'Vocabulario personal con todos los metadatos'],
    ['/users/{uid}/test_history/{id}', 'Resultado de test', 'Solo propietario', 'Historial de exámenes'],
    ['/words/{wordId}', 'Palabra global', 'Lectura autenticados', 'Catálogo compartido (escritura solo Admin SDK)'],
    ['/accounts/{key}', 'Credenciales', 'BLOQUEADO', 'Datos de acceso (no accesible desde cliente)'],
    ['/test_history/{id}', 'Test global', 'Por userId match', 'Historial global (acceso restringido por UID)'],
  ],
  [145, 90, 100, 150]
);

h2('Reglas de seguridad (firestore.rules)');
body('Las reglas implementan el principio de menor privilegio con bloqueo total por defecto:');
codeBlock(`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // BLOQUEO POR DEFECTO — toda ruta no declarada queda denegada
    match /{document=**} {
      allow read, write: if false;
    }

    // Perfil de usuario: solo el propietario (UID == auth.uid)
    match /users/{userId} {
      allow read, update, delete: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId
                    && request.resource.data.id == userId;

      match /{allSubcollections=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Catálogo global: lectura para autenticados, escritura denegada
    match /words/{wordId} {
      allow read: if request.auth != null;
      allow write: if false; // Solo Admin SDK / Cloud Functions
    }

    // Cuentas: completamente bloqueadas desde el cliente
    match /accounts/{docId} {
      allow read, write: if false;
    }
  }
}`);

// ══════════════════════════════════════════════════════════════════════════════
// 7. CLOUD FUNCTIONS E IA
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('7. Cloud Functions e IA (Gemini)');

h2('Función: enrichVocabularyWithAi');
body('Función principal de IA. Recibe una palabra en inglés y devuelve un objeto lingüístico completo generado por Google Gemini 2.5 Flash.');

table(
  ['Propiedad', 'Valor'],
  [
    ['Runtime', 'Node.js 20 (Firebase Functions v2)'],
    ['Región', 'us-central1'],
    ['Timeout', '30 segundos'],
    ['Memoria', '256 MiB'],
    ['Autenticación', 'Obligatoria (request.auth)'],
    ['App Check', 'Desactivado (pendiente activar con Play Integrity)'],
    ['Secreto', 'GEMINI_API_KEY via Google Cloud Secret Manager'],
    ['Modelo IA', 'gemini-2.5-flash (REST API v1beta)'],
  ],
  [160, 335]
);

h2('Respuesta de la función');
table(
  ['Campo', 'Tipo', 'Descripción'],
  [
    ['word', 'string', 'La palabra procesada'],
    ['phoneticIpa', 'string', 'Transcripción IPA (ej: /ˈwɔːtər/)'],
    ['translation', 'string', 'Traducción al español'],
    ['partOfSpeech', 'string', 'sustantivo / verbo / adjetivo / adverbio / modismo'],
    ['exampleEn', 'string', 'Frase de ejemplo natural en inglés'],
    ['exampleEs', 'string', 'Traducción de la frase de ejemplo'],
    ['pronunciationTips', 'string[]', 'Consejos específicos para hispanohablantes'],
    ['difficulty', 'string', 'Nivel CEFR: A1 / A2 / B1 / B2 / C1 / C2'],
    ['timestamp', 'string', 'ISO 8601 del momento de procesamiento'],
  ],
  [140, 80, 275]
);

h2('Función: deleteUserAccount');
body('Función administrativa que elimina permanentemente una cuenta de usuario desde el servidor, garantizando que el Admin SDK con privilegios completos nunca esté en el cliente.');
bullet([
  'Elimina todas las subcolecciones del usuario en Firestore (words, test_history).',
  'Elimina el documento del usuario en /users.',
  'Elimina la cuenta en Firebase Auth.',
  'Requiere confirmación explícita en el payload (campo confirmation: true).',
  'Solo puede ser invocada por el propio usuario autenticado.',
]);

h2('Gestión segura de secretos');
codeBlock(`// En functions/src/index.ts — la clave NUNCA aparece en el bundle del cliente
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const enrichVocabularyWithAi = onCall({
  secrets: [geminiApiKey],  // ← inyección en tiempo de ejecución
}, async (request) => {
  const apiKey = geminiApiKey.value(); // disponible SOLO dentro de la función
  // ...
});

// Para configurar el secreto en producción:
// firebase functions:secrets:set GEMINI_API_KEY
// Para emulación local: functions/.secret.local`);

// ══════════════════════════════════════════════════════════════════════════════
// 8. BACKEND EXPRESS
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('8. Backend Express');

body('El servidor Express actúa como capa de compatibilidad y servicios complementarios. Gestiona autenticación JWT propia, reportes administrativos, el bot de Discord y las notificaciones de actualizaciones.');

h2('Rutas de la API');
table(
  ['Ruta', 'Método', 'Descripción', 'Auth'],
  [
    ['/api/health', 'GET', 'Estado del servidor', 'No'],
    ['/api/auth/login', 'POST', 'Login con email/username y contraseña', 'No'],
    ['/api/auth/register', 'POST', 'Registro de nuevo usuario', 'No'],
    ['/api/auth/change-password', 'POST', 'Cambio de contraseña', 'JWT'],
    ['/api/auth/reset-password', 'POST', 'Reset a contraseña temporal', 'No'],
    ['/api/words', 'GET/POST', 'Listar y crear palabras del usuario', 'JWT'],
    ['/api/words/:id', 'PUT/DELETE', 'Actualizar o borrar una palabra', 'JWT'],
    ['/api/tests', 'GET/POST', 'Historial y guardado de tests', 'JWT'],
    ['/api/discord/notify', 'POST', 'Enviar mensaje al canal Discord', 'JWT'],
    ['/api/updates/check', 'GET', 'Comprobar nueva versión disponible', 'No'],
  ],
  [140, 60, 190, 50]
);

h2('Servicios del backend');
bullet([
  'emailService.ts — Envío de emails transaccionales via Nodemailer (SMTP Strato): bienvenida, contraseña temporal, reportes mensuales.',
  'pdfReportService.ts — Generación de reportes PDF con estadísticas de usuarios usando pdfkit.',
  'excelReportService.ts — Exportación de datos de usuarios en formato Excel con exceljs.',
  'discordBot.ts — Bot de Discord.js para notificaciones de nuevos registros, bajas y actualizaciones al canal del servidor.',
  'monthlyScheduler.ts — Scheduler automático que genera y envía el reporte mensual de actividad.',
  'updateNotifierService.ts — Detecta nuevas versiones del APK en GitHub Releases y notifica a los usuarios.',
]);

h2('Base de datos');
infoBox('Nota importante sobre la persistencia', 'El backend usa db.json como base de datos plana persistente. Funciona correctamente en Render con volumen persistente, pero en Vercel (filesystem efímero) los datos se pierden en cada redeploy. Se recomienda migrar a una base de datos externa (MongoDB Atlas, PlanetScale) para producción a largo plazo.', C.warning);

// ══════════════════════════════════════════════════════════════════════════════
// 9. DESPLIEGUE Y PLATAFORMAS
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('9. Despliegue y Plataformas');

h2('APK Android — GitHub Actions CI/CD');
body('Cada push a la rama main (o manualmente desde la pestaña Actions) desencadena la compilación automática del APK:');
bullet([
  'Workflow: .github/workflows/build-apk.yml',
  'Usa ubuntu-latest con ANDROID_HOME preinstalado.',
  'Ejecuta expo prebuild --platform android para generar el proyecto nativo.',
  'Compila con Gradle assembleRelease.',
  'Publica el APK como artefacto y en GitHub Releases automáticamente.',
  'URL de descarga: github.com/oscarmangutduran/PronounceIt/releases',
]);

h2('Web — Vercel');
bullet([
  'Build command: npm run build --prefix client (Vite + Expo web)',
  'Output directory: client/dist',
  'Rewrites: todas las rutas /api/* van al handler serverless en api/index.ts',
  'Variables de entorno configuradas en el dashboard de Vercel.',
  'URL producción: https://pronounceit-sand.vercel.app',
]);

h2('Backend Express — Render');
bullet([
  'Servicio web Node.js en render.yaml.',
  'Puerto: 5000 (configurado como process.env.PORT).',
  'Variables de entorno: JWT_SECRET, SMTP_*, DISCORD_BOT_TOKEN configuradas en Render dashboard.',
  'Restart automático ante fallos.',
]);

h2('Cloud Functions — Firebase CLI');
codeBlock(`# Desplegar todas las funciones
firebase deploy --only functions

# Configurar el secreto de Gemini (una sola vez)
firebase functions:secrets:set GEMINI_API_KEY

# Ver secretos configurados
firebase functions:secrets:access GEMINI_API_KEY

# Para emulación local (crear functions/.secret.local)
# GEMINI_API_KEY=tu_clave_local_aqui
firebase emulators:start --only functions`);

h2('Docker — Desarrollo local');
body('El docker-compose.yml levanta los dos servicios localmente:');
bullet([
  'Backend Express: puerto 5000 (con hot-reload en desarrollo)',
  'Frontend / Cliente: puerto 3000 (Expo web) o 8080',
  'Ambos comparten la misma red Docker interna.',
]);

// ══════════════════════════════════════════════════════════════════════════════
// 10. SEGURIDAD
// ══════════════════════════════════════════════════════════════════════════════
newPage();
h1('10. Seguridad');

h2('Modelo de seguridad general');
body('La seguridad de PronounceIt se apoya en cuatro pilares:');
bullet([
  'Firestore Security Rules: bloqueo total por defecto, acceso granular por request.auth.uid.',
  'Firebase Auth: tokens JWT firmados por Google, con expiración automática.',
  'Cloud Functions: único punto de acceso a operaciones privilegiadas y secretos.',
  'Google Cloud Secret Manager: ningún secreto de servidor en el bundle del cliente.',
]);

h2('Hallazgos y estado actual');
table(
  ['Severidad', 'Componente', 'Descripción', 'Estado'],
  [
    ['🟡 Medio', 'firebaseClient.ts', 'Firebase keys hardcodeadas como fallback', 'Pendiente'],
    ['🔴 Alto', 'middleware/auth.ts', 'JWT secret fallback "pronounceit_fallback_secret_dev_only"', 'Pendiente'],
    ['🔴 Alto', 'Firestore /accounts', 'Contraseñas almacenadas en texto plano', 'Pendiente'],
    ['🟡 Medio', 'server/src/index.ts', 'CORS sin restricción de origen (acepta *)', 'Pendiente'],
    ['🟡 Medio', 'functions/src/index.ts', 'enforceAppCheck: false (App Check desactivado)', 'Pendiente'],
    ['✅ OK', 'GEMINI_API_KEY', 'Gestionada por Secret Manager, nunca en cliente', 'Correcto'],
    ['✅ OK', 'firestore.rules', 'Principio de menor privilegio implementado', 'Correcto'],
    ['✅ OK', '.gitignore', 'Excluye .env*, google-services.json, .secret.local', 'Correcto'],
  ],
  [65, 115, 195, 80]
);

h2('Recomendaciones prioritarias');

h3('1. Eliminar fallbacks hardcodeados (Crítico)');
body('En firebaseClient.ts, las líneas 169–199 incluyen valores reales de Firebase como último fallback. Reemplazar por:');
codeBlock(`// CORRECTO — falla explícitamente si no hay config
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY
  || process.env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error('[Firebase] FIREBASE_API_KEY no configurada. Revisa .env');
}`);

h3('2. JWT secret sin fallback (Crítico)');
codeBlock(`// middleware/auth.ts — CORRECTO
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET no configurado. La app no puede iniciarse.');
}
const decoded = jwt.verify(token, secret);`);

h3('3. Habilitar App Check (Medio)');
body('Para activar la protección App Check en Cloud Functions y bloquear llamadas no autorizadas:');
bullet([
  'Registrar la app Android en Firebase Console > App Check > Play Integrity.',
  'Registrar la app iOS con App Attest.',
  'Cambiar enforceAppCheck: false → true en functions/src/index.ts.',
  'Configurar debug tokens para entornos de desarrollo.',
]);

h3('4. CORS restringido en producción');
codeBlock(`// server/src/index.ts — CORRECTO para producción
const ALLOWED_ORIGINS = [
  'https://pronounceit-sand.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile / curl
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origen no permitido'));
  },
  credentials: true,
}));`);

// ── Página final ───────────────────────────────────────────────────────────
newPage();
// Fondo oscuro
doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.dark);

doc.circle(doc.page.width / 2, 180, 60).fill(C.primary);
doc.fontSize(32).fillColor(C.white).font('Helvetica-Bold')
   .text('PI', 0, 164, { align: 'center' });

doc.fontSize(24).fillColor(C.white).font('Helvetica-Bold')
   .text('PronounceIt', 50, 265, { align: 'center' });
doc.fontSize(12).fillColor('#9CA3AF').font('Helvetica')
   .text('Documentación generada automáticamente desde el análisis del código fuente.', 80, 300, { align: 'center', width: doc.page.width - 160 });

doc.moveDown(2);
doc.fontSize(10).fillColor('#6B7280')
   .text(`Versión 1.7.1  ·  ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 340, { align: 'center' })
   .text('Proyecto: pronounceit-56fe6  ·  Autor: Oscar Mangut', 50, 358, { align: 'center' })
   .text('Stack: React Native · Firebase · Express · Gemini AI · TypeScript', 50, 376, { align: 'center' });

// ── Finalizar documento ───────────────────────────────────────────────────────
doc.end();
stream.on('finish', () => {
  console.log('✅ PDF generado: ' + OUTPUT);
});
stream.on('error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
