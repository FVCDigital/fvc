import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel([
            'resources/css/app.css',
            'resources/js/app.js',
        ]),
    ],
    build: {
        target: 'es2020',
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'es2020',
        },
    },
});
