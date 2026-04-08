import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      ".next/**",
      "build/**",
      "coverage/**",
      "out/**",
      "playwright-report/**",
      "temp-uploads/**",
      "test-results/**",
    ],
  },
  ...compat.config({
    extends: ["next/core-web-vitals"],
    rules: {
      "prefer-const": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "warn",
      "react/no-unescaped-entities": "error",
    },
  }),
];

export default config;
