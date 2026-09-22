import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

// Bucket privado ya declarado en neon.ts y provisionado con `neon deploy`.
// Las credenciales AWS_* las inyecta Neon automáticamente (ver skill neon-object-storage).
export const uploads = new Files({ adapter: neon({ bucket: "uploads" }) });
