const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: ["dist/**", "coverage/**", ".expo/**", "design/**", "supabase/**"],
  },
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    settings: { "import/core-modules": ["repdb-archive", "repdb-images"] },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "tests/**/*"],
    languageOptions: {
      globals: {
        jest: "readonly",
        expect: "readonly",
        it: "readonly",
        afterEach: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
      },
    },
  },
]);
