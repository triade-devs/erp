/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "next/core-web-vitals",
    "prettier",
  ],
  rules: {
    // Impede import de internos de outro módulo sem passar pelo barrel index.ts
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/modules/*/actions/*", "@/modules/*/components/*", "@/modules/*/queries/*", "@/modules/*/schemas/*", "@/modules/*/services/*", "@/modules/*/hooks/*", "@/modules/*/types/*"],
            message: "Importe apenas pelo barrel: @/modules/<modulo> (index.ts)",
          },
        ],
      },
    ],
  },
};
