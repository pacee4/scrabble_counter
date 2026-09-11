import { defineConfig } from 'vite';
import { resolve } from "path";

export default defineConfig({
    base: "./",
    server: {
        host: "localhost",
        port: 8080,
        open: true
    },
    build: {
        target: "es2020",
        minify: "terser",
        terserOptions: {
            compress: {
                pure_funcs: ["console.log", "console.warn"]
            }
        },
        emptyOutDir: true
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    }
});