import js from "@eslint/js"
import globals from "globals"
import stylistic from "@stylistic/eslint-plugin-js"

export default {
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      "global": "readonly",
      ...globals.browser
    }
  },
  plugins: {
    "@stylistic/js": stylistic
  },
  ignores: [
    "dist/*",
    "vendor/*"
  ],
  rules: Object.assign({}, js.configs.recommended.rules, {
    "@stylistic/js/array-bracket-spacing": [ "error", "always" ],
    "@stylistic/js/arrow-spacing": [ "error", { "before": true, "after": true } ],
    "@stylistic/js/block-spacing": [ "error", "always" ],
    "@stylistic/js/comma-dangle": [ "error", "never" ],
    "@stylistic/js/comma-spacing": [ "error", { "before": false, "after": true } ],
    "@stylistic/js/comma-style": [ "error", "last" ],
    "@stylistic/js/computed-property-spacing": [ "error", "never" ],
    "@stylistic/js/eol-last": "error",
    "@stylistic/js/function-call-spacing": [ "error", "never" ],
    "@stylistic/js/indent": [ "error", 2, { "SwitchCase": 1 } ],
    "@stylistic/js/no-trailing-spaces": "error",
    "@stylistic/js/quotes": [ "error", "double", { "avoidEscape": true } ],
    "@stylistic/js/semi": [ "error", "never" ],
    "@stylistic/js/space-infix-ops": [ "error" ],
    "@stylistic/js/keyword-spacing": [ "error" ],
    "curly": [ "error", "multi-line" ],
    "no-restricted-syntax": [ "error",
      { "selector": "Property[key.name='SAFE_FOR_XML'][value.value=false]", "message": "DOMPurify SAFE_FOR_XML must not be disabled (mXSS risk)." },
      { "selector": "Property[key.name='ALLOW_DATA_ATTR'][value.value=true]", "message": "DOMPurify ALLOW_DATA_ATTR must not be enabled (attribute-smuggling risk)." }
    ],
    "no-unused-vars": [ "error", { "args": "none", "caughtErrors": "none" } ],
    "no-var": "error",
    "prefer-const": [ "error", { "destructuring": "all" } ]
  })
}
