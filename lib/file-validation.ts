// `file.type` en un FormData lo manda el navegador a partir de la extensión del
// archivo elegido — no es una garantía, un cliente modificado (o un .exe
// renombrado a .pdf) puede mandar cualquier valor. Esto verifica los primeros
// bytes reales del archivo (firma / "magic bytes") antes de subirlo al bucket.

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

export type ImageKind = "jpeg" | "png" | "webp";

export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

export function isPdf(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
}
