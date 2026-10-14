import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Librerías de terceros vendorizadas sin build step propio (jsQR, jsPDF)
    // y prototipos históricos — no es código nuestro, lint-earlos solo genera ruido.
    "public/vendor/**",
    "legacy/**",
  ]),
]);

export default eslintConfig;
