import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
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

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
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
