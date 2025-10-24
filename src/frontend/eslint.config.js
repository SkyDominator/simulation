import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Override rules for test files
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "**/test/**/*.{ts,tsx}",
      "**/e2e/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-refresh/only-export-components": "off",
      "no-useless-escape": "warn",
      // Disable React hooks rules for E2E tests (Playwright uses 'use' for fixtures, not React hooks)
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
      // Enforce mock layer adoption - prevent direct Supabase client imports in tests
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/supabaseClient", "**/supabaseClient.*"],
              message:
                "Do not import Supabase client directly in tests. Use mock layers from test/shared/apiMocks instead.",
            },
            {
              group: ["@supabase/supabase-js"],
              message:
                "Do not import @supabase/supabase-js directly in tests. Use mock layers from test/shared/apiMocks instead.",
            },
          ],
        },
      ],
    },
  },
]);
