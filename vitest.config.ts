
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    exclude: ['node_modules/**', '**/node_modules/**', '.cache/**', 'dist', 'build'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@capacitor/filesystem': path.resolve(__dirname, 'client/src/stubs/capacitor/filesystem.ts'),
      '@capacitor/app': path.resolve(__dirname, 'client/src/stubs/capacitor/app.ts'),
      '@capacitor/status-bar': path.resolve(__dirname, 'client/src/stubs/capacitor/statusBar.ts'),
      '@capacitor-community/media': path.resolve(__dirname, 'client/src/stubs/capacitor/media.ts'),
    },
  },
});
