import { defineConfig } from "vite";

// `reelvault-sdk` is not published to npm — scripts/postinstall.ts links it
// into node_modules from a server checkout next to this plugin, and that link
// resolves here (at runtime the host swaps the module for its own shim anyway).
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
