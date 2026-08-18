import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

// Flat-config port of the old .eslintrc.js. Every rule below is carried over
// verbatim, with two deliberate drops:
//
//   - @typescript-eslint/interface-name-prefix was removed from the plugin back
//     in v3. eslintrc tolerated switching off a rule that no longer exists;
//     flat config errors on it. It was a no-op either way.
//   - plugin:prettier/recommended is gone. Formatting is enforced by prettier
//     directly (see the root .prettierrc and `npm run format:check`), which
//     keeps lint runs from re-parsing every file just to diff whitespace.
//
// Note there is deliberately no js.configs.recommended / eslint:recommended
// here: the old config never extended it, and adding it would newly flag
// no-useless-escape and no-control-regex in existing code. Tightening the
// baseline is a separate decision from porting the config.
export default tseslint.config(
    {
        ignores: ['dist/**', 'coverage/**', 'snapshots/**', 'eslint.config.mjs'],
    },
    ...tseslint.configs.recommended,
    importPlugin.flatConfigs.typescript,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'error',
            // typescript-eslint v8 moved this out of `recommended` into
            // `strict`. Re-stated explicitly so the four pre-existing warnings
            // this repo already had don't silently disappear in the upgrade.
            '@typescript-eslint/no-non-null-assertion': 'warn',
            // Relative imports are banned repo-wide on the backend; everything
            // goes through the @/ alias or a bare package specifier. This is
            // what lets @nonce/shared be imported without an exception.
            'no-restricted-imports': ['error', { patterns: ['.*'] }],
            'import/no-cycle': 2,
            'no-console': ['error', { allow: ['warn', 'error'] }],
            // Not from the old config. Enabled because the codebase already
            // carries a hand-written eslint-disable for it (in
            // fellowship-documents.service.ts), which eslint 9 correctly
            // reported as dead while the rule was off. Turning the rule on makes
            // that directive meaningful instead of deleting the author's intent.
            'no-control-regex': 'error',
        },
    },
);
