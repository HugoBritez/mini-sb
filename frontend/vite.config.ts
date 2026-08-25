import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
	plugins: [
		wasm(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter()
		})
	],
	// Matches the config in automerge-repo's own svelte-counter example:
	// vite-plugin-wasm handles the wasm-bindgen "bundler" style import
	// (`import * as wasm from "*.wasm"`) that @automerge/automerge uses,
	// both on the main thread and inside the worker automerge-repo spawns.
	worker: {
		format: 'es',
		plugins: () => [wasm()]
	}
});
