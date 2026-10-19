'use strict';

// ---- Generar PDF con jsPDF (incluye logo TAGSENSE y firma) ----
// jsPDF se carga como script clásico (vendor/jspdf.umd.min.js) antes de este
// módulo — ver public/index.html — y queda disponible como global window.jspdf.

import { COMPONENTE_META } from './componentes.js';

export function calcularDuracion(hi, ht){
  if (!hi || !ht) return '—';
  const [h1,m1] = hi.split(':').map(Number);
  const [h2,m2] = ht.split(':').map(Number);
  let mins = (h2*60+m2) - (h1*60+m1);
  if (mins < 0) mins += 24*60;
  const hh = Math.floor(mins/60), mm = mins%60;
  return `${hh}h ${mm}min`;
}

export function generarInformePdf(data){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const COPPER = [208, 120, 56];       // Cobre industrial (#D07838)
  const COPPER_LIGHT = [240, 136, 64]; // Naranja cobrizo (#F08840)
  const IVORY_PALE = [245, 244, 234];  // Marfil claro (#F5F4EA)
  const DARK = [23, 25, 26];           // Negro carbón (#17191A)
  const TEXT = [38, 38, 38];
  const MUTED = [167, 167, 155];       // Gris mineral (#A7A79B)
  const RED = [201, 18, 51];
  const ORANGE = [235, 145, 43];
  const GREEN = [23, 123, 87];
  const RULE = [214, 210, 199];
  const KHAKI = COPPER;
  const KHAKI_PALE = IVORY_PALE;

  const docNum = `TAGSENSE-${data.equipoId}-${data.folio}`;
  let y = 0;
  let seccionN = 0;

  // ---------- ENCABEZADO ----------
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setFillColor(...COPPER);
  doc.rect(0, 26, pageW, 1.1, 'F');

  // Logo claro fijo: el encabezado del PDF siempre se pinta con DARK de fondo
  // (ver doc.rect arriba), sin importar el tema activo en la app.
  try { doc.addImage('assets/img/logo-mark.png', 'PNG', marginX, 5.5, 15, 15); } catch(e) {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(245, 242, 235);
  doc.text('INFORME DE MANTENIMIENTO', marginX + 20, 12.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COPPER_LIGHT);
  doc.text(`Documento técnico N° ${docNum}`, marginX + 20, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COPPER);
  doc.text('TAGSENSE', pageW - marginX, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 148, 140);
  doc.text('Plataforma de activos industriales', pageW - marginX, 15, { align: 'right' });

  // ---------- FRANJA DE CONTROL DOCUMENTAL ----------
  y = 32;
  doc.setFillColor(...KHAKI_PALE);
  doc.rect(marginX, y - 5, contentW, 9, 'F');
  const ctrlW = contentW / 4;
  function ctrlItem(label, val, i){
    const x = marginX + ctrlW * i + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y - 1.4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(String(val), x, y + 2.6);
    if (i > 0) { doc.setDrawColor(...RULE); doc.line(marginX + ctrlW * i, y - 4.3, marginX + ctrlW * i, y + 3.3); }
  }
  ctrlItem('Folio', data.folio, 0);
  ctrlItem('Fecha de emisión', data.fecha, 1);
  ctrlItem('Clasificación', 'Uso interno', 2);
  ctrlItem('Revisión', 'Rev. 0', 3);
  y += 12;

  // ---------- RESUMEN EJECUTIVO ----------
  const SEV_COLOR = { alta: RED, media: ORANGE, baja: GREEN };
  const SEV_LABEL = { alta: 'SEVERIDAD ALTA', media: 'SEVERIDAD MEDIA', baja: 'SEVERIDAD BAJA' };
  const sevColor = SEV_COLOR[data.severidad] || KHAKI;
  const sevLabel = data.fallas ? (SEV_LABEL[data.severidad] || 'FALLA REGISTRADA') : 'SIN FALLAS';

  const boxH = 30;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, y, contentW, boxH, 1.5, 1.5, 'D');
  doc.setFillColor(...(data.fallas ? sevColor : GREEN));
  doc.rect(marginX, y, 2, boxH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...(data.fallas ? sevColor : GREEN));
  doc.text(sevLabel, marginX + 7, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(data.operativo ? 'EQUIPO OPERATIVO' : 'EQUIPO NO OPERATIVO', pageW - marginX - 4, y + 6, { align: 'right' });

  const colW3 = (contentW - 10) / 3;
  function resumenItem(label, val, col, row){
    const x = marginX + 7 + colW3 * col;
    const yy = y + 13 + row * 8.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(String(val), x, yy + 4);
  }
  resumenItem('Equipo', data.equipo, 0, 0);
  resumenItem('ID TagSense', data.equipoId, 1, 0);
  resumenItem('Técnico ejecutor', data.tecnico, 2, 0);
  resumenItem('Horómetro', data.horometro, 0, 1);
  resumenItem('Horario de trabajo', `${data.horaInicio} – ${data.horaTermino}`, 1, 1);
  resumenItem('Duración', calcularDuracion(data.horaInicio, data.horaTermino), 2, 1);

  y += boxH + 11;

  // ---------- HELPERS DE SECCIÓN ----------
  function checkPageBreak(minSpace){
    if (y > pageH - minSpace) { doc.addPage(); y = 22; }
  }
  function seccion(titulo){
    seccionN++;
    doc.setFillColor(...KHAKI);
    doc.roundedRect(marginX, y - 4.6, 6.4, 6.4, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(String(seccionN), marginX + 3.2, y - 0.9, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(35, 33, 28);
    doc.text(titulo.toUpperCase(), marginX + 10, y);
    y += 4;
    doc.setDrawColor(...RULE);
    doc.line(marginX, y, pageW - marginX, y);
    y += 6.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
  }
  function parrafo(texto){
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(texto, contentW - 2);
    doc.text(lines, marginX, y);
    y += lines.length * 4.6 + 8;
  }
  function calloutBox(color, tag, texto){
    const lines = doc.splitTextToSize(texto, contentW - 14);
    const h = lines.length * 4.6 + 11;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, contentW, h, 1.5, 1.5, 'D');
    doc.setFillColor(...color);
    doc.rect(marginX, y, 1.8, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...color);
    doc.text(tag.toUpperCase(), marginX + 6, y + 6);
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(lines, marginX + 6, y + 11.5);
    y += h + 8;
  }
  function checkFilaPdf(marcado, texto){
    doc.setDrawColor(190, 190, 190);
    doc.setFillColor(marcado ? KHAKI[0] : 255, marcado ? KHAKI[1] : 255, marcado ? KHAKI[2] : 255);
    doc.roundedRect(marginX, y - 3.6, 4.4, 4.4, 1, 1, marcado ? 'FD' : 'D');
    if (marcado) {
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(marginX + 0.9, y - 1.6, marginX + 1.9, y - 0.4);
      doc.line(marginX + 1.9, y - 0.4, marginX + 3.6, y - 3.1);
      doc.setLineWidth(0.2);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(texto, marginX + 8, y);
    y += 7.5;
  }

  // ---------- 1. DESCRIPCIÓN DEL TRABAJO ----------
  checkPageBreak(50);
  seccion('Descripción del trabajo realizado');
  parrafo(data.descripcion || '—');

  // ---------- 2. HALLAZGOS Y FALLAS ----------
  if (data.fallas) {
    checkPageBreak(55);
    seccion('Hallazgos y fallas encontradas');
    calloutBox(sevColor, SEV_LABEL[data.severidad] || 'Hallazgo registrado', data.fallas);
  }

  // ---------- 3. REPUESTOS ----------
  checkPageBreak(40);
  seccion('Repuestos utilizados');
  if (data.repuestosUsados && data.repuestosDetalle) {
    parrafo(data.repuestosDetalle);
  } else {
    doc.setFont('times', 'italic');
    doc.setTextColor(...MUTED);
    doc.text('No se utilizaron repuestos en esta intervención.', marginX, y);
    y += 10;
  }

  // ---------- 4. COMPONENTE INTERVENIDO ----------
  if (data.componente && COMPONENTE_META[data.componente]) {
    checkPageBreak(40);
    seccion('Componente intervenido');
    parrafo(`${COMPONENTE_META[data.componente].nombre} · Empresa: ${data.empresa || 'Taller interno'}`);
  }

  // ---------- 5. VERIFICACIÓN EN TERRENO ----------
  checkPageBreak(45);
  seccion('Verificación en terreno');
  if (data.instructivosUsados && data.instructivosNombres.length) {
    data.instructivosNombres.forEach(n => {
      doc.setFillColor(...KHAKI);
      doc.circle(marginX + 1.2, y - 1.6, 0.9, 'F');
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      doc.text(n, marginX + 5, y);
      y += 6;
    });
    y += 4;
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('No se utilizaron instructivos de verificación.', marginX, y);
    y += 10;
  }

  // ---------- 6. ALCANCE TÉCNICO DEL MANTENEDOR ----------
  if (data.alcances) {
    checkPageBreak(50);
    seccion('Alcance técnico del mantenedor');
    calloutBox(KHAKI, 'Nota técnica de terreno', data.alcances);
  }

  // ---------- 7. SOLICITUD DE MANTENIMIENTO ----------
  if (data.smAplica) {
    checkPageBreak(55);
    seccion('Solicitud de mantenimiento generada');
    const compNombre = data.smComponente && COMPONENTE_META[data.smComponente] ? COMPONENTE_META[data.smComponente].nombre : '—';
    const PR_COLOR = { 'Baja': GREEN, 'Media': ORANGE, 'Alta': RED, 'Urgente': RED };
    const prColor = PR_COLOR[data.smPrioridad] || KHAKI;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(data.smFolio || 'SM', marginX, y);
    const prW = doc.getTextWidth((data.smPrioridad || '').toUpperCase()) + 6;
    doc.setFillColor(...prColor);
    doc.roundedRect(pageW - marginX - prW, y - 4.2, prW, 5.6, 1.4, 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text((data.smPrioridad || '').toUpperCase(), pageW - marginX - prW/2, y - 0.6, { align: 'center' });
    y += 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Tipo: ${data.smTipo || '—'}   ·   Componente asociado: ${compNombre}`, marginX, y);
    y += 7;
    parrafo(data.smDescripcion || 'Sin detalle adicional.');
  }

  // ---------- 8. CHECKLIST ----------
  checkPageBreak(30);
  seccion('Checklist de cierre');
  checkFilaPdf(data.operativo, 'Equipo queda operativo');
  y += 4;

  // ---------- 9. RECOMENDACIONES ----------
  if (data.observaciones) {
    checkPageBreak(40);
    seccion('Recomendaciones');
    parrafo(data.observaciones);
  }

  // ---------- 10. REGISTRO FOTOGRÁFICO ----------
  if (data.fotos && data.fotos.length) {
    checkPageBreak(75);
    seccion('Registro fotográfico');
    let fx = marginX, col = 0;
    const fw = 36, fh = 36, gap = 4;
    data.fotos.slice(0, 6).forEach((foto, i) => {
      doc.setDrawColor(...RULE);
      doc.rect(fx, y, fw, fh, 'D');
      try { doc.addImage(foto, 'JPEG', fx + 0.6, y + 0.6, fw - 1.2, fh - 1.2); } catch(e) {}
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(`Fig. ${i + 1}`, fx, y + fh + 4);
      col++;
      fx += fw + gap;
      if (col === 4) { col = 0; fx = marginX; y += fh + 9; }
    });
    if (col !== 0) y += fh + 9;
    y += 4;
  }

  // ---------- 11. VALIDACIÓN Y FIRMA ----------
  checkPageBreak(70);
  seccion('Validación y firma');
  const sigBoxW = 80, sigBoxH = 32;
  doc.setDrawColor(...RULE);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, y, sigBoxW, sigBoxH, 1.5, 1.5, 'D');
  try { doc.addImage(data.firmaDataUrl, 'PNG', marginX + 4, y + 3, sigBoxW - 8, sigBoxH - 13); } catch(e) {}
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX + 5, y + sigBoxH - 8, marginX + sigBoxW - 5, y + sigBoxH - 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text(data.tecnico, marginX + 5, y + sigBoxH - 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Técnico ejecutor', marginX + 5, y + sigBoxH - 0.5);

  const revX = marginX + sigBoxW + 10;
  doc.setDrawColor(...RULE);
  doc.roundedRect(revX, y, sigBoxW, sigBoxH, 1.5, 1.5, 'D');
  doc.setDrawColor(200, 200, 200);
  doc.line(revX + 5, y + sigBoxH - 8, revX + sigBoxW - 5, y + sigBoxH - 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Sin asignar', revX + 5, y + sigBoxH - 3.5);
  doc.text('Supervisor / revisor', revX + 5, y + sigBoxH - 0.5);

  y += sigBoxH + 7;
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const nota = doc.splitTextToSize('Documento validado digitalmente por el técnico ejecutor mediante firma electrónica capturada en la plataforma TAGSENSE. La validación del supervisor queda pendiente de firma física o digital posterior.', contentW);
  doc.text(nota, marginX, y);

  // ---------- PIE DE PÁGINA ----------
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.line(marginX, pageH - 14, pageW - marginX, pageH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${docNum}  ·  Confidencial — uso interno`, marginX, pageH - 9);
    doc.text(`Página ${p} de ${totalPages}`, pageW - marginX, pageH - 9, { align: 'right' });
  }

  return doc;
}
