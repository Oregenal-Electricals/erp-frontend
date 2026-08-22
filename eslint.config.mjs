import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // This rule flags the standard "fetch data on mount" pattern
      // (useEffect(() => { load(); }, [load])) used throughout this
      // codebase, which is a safe and idiomatic way to fetch data
      // without a data-fetching library. Turned off rather than
      // rewriting every occurrence project-wide.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
