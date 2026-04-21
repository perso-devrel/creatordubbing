import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
  })),
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.serviceworker,
      },
    },
  },
  globalIgnores([
    "dist/**",
    "node_modules/**",
    "scripts/**",
    "vite.config.ts",
  ]),
]);

export default eslintConfig;
