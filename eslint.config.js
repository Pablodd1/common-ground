import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'api']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui primitives and shared hook+component modules: these files
    // intentionally export variants/hooks next to components; the fast-refresh
    // boundary warning is noise for them, not an actionable defect.
    files: [
      'src/components/ui/**',
      'src/components/community/Media.tsx',
      'src/components/community/Celebrations.tsx',
      'src/providers/trpc.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
