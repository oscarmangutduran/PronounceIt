'use strict';
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const OUTPUT = path.join(__dirname, '..', 'Manual_Tecnico_PronounceIt.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });
const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);

const C = {
  primary:'#1A56DB', accent:'#7E3AF2', success:'#057A55', warning:'#B45309',
  danger:'#C81E1E', dark:'#111827', mid:'#374151', light:'#6B7280',
  pale:'#F3F4F6', white:'#FFFFFF', border:'#D1D5DB'
};

let pageNum = 0;
function newPage() {
  doc.addPage(); pageNum++;
  doc.rect(0,0,doc.page.width,6).fill(C.primary);
  doc.fontSize(8).fillColor(C.light)
     .text('PronounceIt v1.7.1 — Documentación Técnica', 50, doc.page.height-30, {align:'left'})
     .text('Página '+pageNum, 0, doc.page.height-30, {align:'right',width:doc.page.width-50});
  doc.y=28; doc.fillColor(C.dark);
}
function h1(t){doc.moveDown(0.4);doc.fontSize(20).fillColor(C.primary).font('Helvetica-Bold').text(t);doc.moveDown(0.1);doc.rect(50,doc.y,doc.page.width-100,2).fill(C.primary);doc.moveDown(0.5);doc.font('Helvetica').fillColor(C.dark);}
function h2(t){doc.moveDown(0.5);doc.fontSize(13).fillColor(C.accent).font('Helvetica-Bold').text(t);doc.moveDown(0.25);doc.font('Helvetica').fillColor(C.dark);}
function h3(t){doc.moveDown(0.3);doc.fontSize(11).fillColor(C.mid).font('Helvetica-Bold').text(t);doc.moveDown(0.15);doc.font('Helvetica').fillColor(C.dark);}
function body(t){doc.fontSize(10).fillColor(C.dark).font('Helvetica').text(t,{lineGap:2});doc.moveDown(0.3);}
function bullet(items){items.forEach(i=>{const x=doc.x;doc.fontSize(10).fillColor(C.primary).text('• ',x,doc.y,{continued:true,width:14}).fillColor(C.dark).text(i,{width:doc.page.width-120,lineGap:2});});doc.moveDown(0.2);}
function infoBox(title,text,color){const y=doc.y,w=doc.page.width-100;doc.fontSize(10).font('Helvetica-Bold').fillColor(color).text(title,62,y+5,{width:w-20});doc.font('Helvetica').fillColor(C.mid).text(text,62,doc.y+2,{width:w-20});const h=doc.y-y+8;doc.rect(50,y,w,h).stroke(color);doc.rect(50,y,4,h).fill(color);doc.y=y+h+10;doc.fillColor(C.dark);}
function tbl(headers,rows,widths){
  const sx=50,rh=18;let y=doc.y,tw=widths.reduce((a,b)=>a+b,0);
  doc.rect(sx,y,tw,rh).fill(C.primary);
  let x=sx;headers.forEach((h,i)=>{doc.fontSize(8.5).fillColor(C.white).font('Helvetica-Bold').text(h,x+4,y+5,{width:widths[i]-8,lineBreak:false});x+=widths[i];});
  y+=rh;
  rows.forEach((row,ri)=>{
    doc.rect(sx,y,tw,rh).fill(ri%2===0?C.pale:C.white).stroke(C.border);
    x=sx;row.forEach((cell,ci)=>{doc.fontSize(8.5).fillColor(C.dark).font('Helvetica').text(String(cell),x+4,y+5,{width:widths[ci]-8,lineBreak:false});x+=widths[ci];});
    y+=rh;
  });
  doc.y=y+8;doc.fillColor(C.dark);
}
function code(src){
  const lines=src.split('\n'),lh=12,h=lines.length*lh+14;
  doc.rect(50,doc.y,doc.page.width-100,h).fill('#1E1E2E');
  let cy=doc.y+7;
  lines.forEach(l=>{doc.fontSize(7.5).fillColor('#A6E3A1').font('Courier').text(l,60,cy,{lineBreak:false});cy+=lh;});
  doc.y=doc.y+h+8;doc.font('Helvetica').fillColor(C.dark);
}

// PORTADA
doc.addPage(); pageNum++;
doc.rect(0,0,doc.page.width,260).fill(C.primary);
doc.rect(0,220,doc.page.width,60).fill(C.accent);
doc.rect(0,260,doc.page.width,doc.page.height-260).fill(C.pale);
doc.circle(doc.page.width/2,95,48).fill(C.white);
doc.fontSize(26).fillColor(C.primary).font('Helvetica-Bold').text('PI',0,82,{align:'center'});
doc.fontSize(30).fillColor(C.white).font('Helvetica-Bold').text('PronounceIt',50,160,{align:'center'});
doc.fontSize(12).fillColor('#BFD7FF').font('Helvetica').text('Plataforma inteligente de aprendizaje de pronunciación en inglés',60,196,{align:'center',width:doc.page.width-120});
doc.roundedRect(doc.page.width/2-38,240,76,18,9).fill(C.white);
doc.fontSize(10).fillColor(C.accent).font('Helvetica-Bold').text('v 1.7.1',0,246,{align:'center'});
doc.fontSize(10).fillColor(C.mid).font('Helvetica')
   .text('Documentación Técnica y Funcional',50,288,{align:'center'})
   .text('Android APK  ·  Web PWA  ·  iOS',50,304,{align:'center'})
   .text('Generado el '+new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'}),50,320,{align:'center'});
const tags=['React Native','Firebase','Gemini AI','Express','TypeScript'];
let tx=(doc.page.width-tags.length*78)/2;
tags.forEach(tag=>{doc.roundedRect(tx,350,72,18,9).stroke(C.primary);doc.fontSize(8.5).fillColor(C.primary).text(tag,tx,356,{width:72,align:'center',lineBreak:false});tx+=78;});
doc.rect(0,doc.page.height-44,doc.page.width,44).fill(C.dark);
doc.fontSize(9).fillColor(C.light).text('c 2024 Oscar Mangut — PronounceIt',50,doc.page.height-28,{align:'center'});

// ÍNDICE
newPage(); h1('Índice de Contenidos');
const toc=[['1.','Visión General'],['2.','Arquitectura del Sistema'],['3.','Stack Tecnológico'],['4.','Módulos Funcionales'],['5.','Autenticación y Gestión de Usuarios'],['6.','Firebase y Firestore'],['7.','Cloud Functions e IA'],['8.','Backend Express'],['9.','Despliegue y Plataformas'],['10.','Seguridad y Recomendaciones']];
toc.forEach(([n,t],i)=>{
  const y=doc.y;
  doc.fontSize(11).fillColor(C.primary).font('Helvetica-Bold').text(n,50,y,{width:24,lineBreak:false});
  doc.fillColor(C.dark).font('Helvetica').text(t,76,y,{width:360,lineBreak:false});
  doc.fillColor(C.border).text('. . . . . . . . . . . . . . . . . . .',440,y,{width:60,lineBreak:false});
  doc.fillColor(C.mid).font('Helvetica-Bold').text(String(i+3),504,y,{width:30,align:'right',lineBreak:false});
  doc.moveDown(0.55);
});

// 1. VISIÓN GENERAL
newPage(); h1('1. Visión General');
body('PronounceIt es una plataforma educativa multiplataforma orientada al aprendizaje del inglés para hispanohablantes. Combina un vocabulario personal inteligente, retroalimentación de pronunciación, tests interactivos y enriquecimiento automático por IA para ofrecer una experiencia de aprendizaje completa y adaptativa.');
h2('¿Qué puede hacer el usuario?');
bullet(['Registrar y organizar su vocabulario personal en inglés con categorías personalizadas.','Ver transcripción IPA, guía fonética simplificada, traducción y ejemplos de cada palabra.','Enriquecer palabras automáticamente con IA (Google Gemini 2.5 Flash).','Practicar con flashcards de repetición espaciada (sistema SRS).','Realizar tests de vocabulario y verbos irregulares con puntuación CEFR (A1-C2).','Consultar historial completo de exámenes y progreso.','Usar la app sin conexión con sincronización automática al reconectarse.','Acceder desde Android (APK), navegador web (PWA) o iOS.']);
h2('Plataformas soportadas');
tbl(['Plataforma','Tecnología','URL / Identificador','Disponible'],[['Android APK','Expo prebuild + Gradle (CI/CD)','github.com/releases','Si'],['Web / PWA','Expo Web + Vite, Vercel','pronounceit-sand.vercel.app','Si'],['iOS','Expo compatible','Apple Developer requerido','En desarrollo']],[100,170,165,60]);
infoBox('Version actual','v1.7.1 — Incluye logo unificado multiplataforma, correccion de UI mobile, CI/CD automatico para APK en GitHub Actions y soporte para multiples idiomas de aprendizaje simultaneos.',C.success);
