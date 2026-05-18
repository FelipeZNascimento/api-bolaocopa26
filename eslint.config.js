// @ts-check

import eslint from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import vitest from "@vitest/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

export default [
  {
    ignores: ["**/*.js", "dist/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "no-undef": "off", // TypeScript handles this check
    },
  },
  perfectionist.configs["recommended-natural"],
  {
    rules: {
      "perfectionist/sort-imports": [
        "error",
        {
          groups: [
            "type",
            "type-import",
            "type-internal",
            "type-parent",
            "type-sibling",
            "type-index",
            "value-builtin",
            "value-external",
            "value-internal",
            "value-parent",
            "value-sibling",
            "value-index",
            "side-effect",
            "side-effect-style",
            "style",
            "unknown",
          ],
          newlinesBetween: "ignore",
          order: "asc",
          type: "natural",
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "@typescript-eslint/unbound-method": "off",
    },
  },
];
