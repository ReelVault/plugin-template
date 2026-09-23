import { defineConfig } from "vite";

// `@reelvault/sdk` resolves from node_modules (a regular devDependency) — at
// runtime the host swaps the module for its own copy anyway.
export default defineConfig({
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	build: {
		outDir: "dist",
		emptyOutDir: true,
		target: "esnext",
		lib: {
			entry: new URL("./src/index.tsx", import.meta.url).pathname,
			formats: ["es"],
			fileName: () => "index.js",
		},
	},
});
