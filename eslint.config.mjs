import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Standard Next.js data-fetch / hydration patterns; too noisy for this codebase.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["electron/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist-electron/**",
  ]),
]);

export default eslintConfig;
