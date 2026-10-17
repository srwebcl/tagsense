'use strict';

// Estado del informe actualmente en vista previa — lo escriben tres módulos
// distintos (informe-form.js al construir uno nuevo, historial.js al reabrir
// uno pasado, informe-sync.js al marcarlo guardado), así que vive en un objeto
// mutable compartido en vez de intentar que uno de los tres sea "el dueño".
export const informeState = {
  ultimoInformeData: null,
  // 'nuevo' | 'historial' — de dónde se abrió la vista previa.
  previewOrigen: 'nuevo',
  // Evita duplicar el registro en el servidor si el técnico descarga el PDF
  // y además lo comparte (o presiona "Finalizar") para el mismo informe.
  informeGuardado: false,
};
