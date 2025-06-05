module.exports = exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    project: "./tsconfig.json",
  },
  extends: ["plugin:@typescript-eslint/recommended"],
  rules: {
    "@typescript-eslint/explicit-function-return-type": 1,
    "no-console": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "import/first": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
  plugins: ["simple-import-sort", "import"],
};
