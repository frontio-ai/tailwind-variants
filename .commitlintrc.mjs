import conventional from "@commitlint/config-conventional";


const commitLintConfig = {
  extends: ["@commitlint/config-conventional"],
  plugins: ["commitlint-plugin-function-rules"],
  helpUrl:
    "https://github.com/jrgarciadev/tailwind-variants/blob/main/CONTRIBUTING.MD#commit-convention",
  rules: {
    ...conventional.rules,
    "type-enum": [
      2,
      "always",
      ["feat", "feature", "fix", "refactor", "docs", "build", "test", "ci", "chore"],
    ],
    "function-rules/header-max-length": [0],
  },
};

export default commitLintConfig;
