import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // ARCHITECTURAL BOUNDARY -- do not remove.
    //
    // src/server/ holds all business logic. It must stay framework-agnostic so
    // it can be lifted into a standalone Node service (or shared with the Expo
    // app) in a later version without a rewrite. These rules make a violation
    // fail the build instead of relying on anyone remembering.
    files: ["src/server/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*"],
              message:
                "src/server must stay framework-agnostic. Move Next.js-specific code into src/app.",
            },
            {
              group: ["@/app/*", "@/components/*"],
              message: "src/server must not depend on the UI layer.",
            },
            {
              group: ["react", "react-dom"],
              message: "src/server must not depend on React.",
            },
          ],
        },
      ],
    },
  },
  {
    // Route handlers and pages must not reach past the service layer straight
    // into the database. They call services; services own the queries.
    files: ["src/app/**/*.ts", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/db", "@/server/repositories/*"],
              message:
                "Do not query the database from the app layer. Call a service in src/server/services instead.",
            },
            {
              group: ["@prisma/client"],
              message:
                "Import Prisma types from @/types instead of coupling the UI to the ORM.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
