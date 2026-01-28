const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    js.configs.recommended,
    {
        files: ["src/**/*.js", "tests/**/*.js"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            // Add custom rules here
        },
    },
];
