#!/usr/bin/env bun
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
} from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

const uiDir = join(root, "ui");
if (existsSync(uiDir)) {
	const proc = Bun.spawn(["bun", "install"], {
		cwd: uiDir,
		stdout: "inherit",
		stderr: "inherit",
	});
	if ((await proc.exited) !== 0) process.exit(1);
} else {
	console.log(
		"No ui/ directory — schema-only plugin, skipping the UI dependency install.",
	);
}

// `reelvault-sdk` is not published to npm — the UI build and the schema step
// resolve it from a server checkout next to this plugin (or REELVAULT_SDK_PATH).
const candidates = [
	process.env.REELVAULT_SDK_PATH,
	join(root, "../reelvault/sdk"),
	join(root, "../ReelVault.Server/sdk"),
	join(root, "server/sdk"),
].filter((candidate): candidate is string => Boolean(candidate));

const sdkDir = candidates.find((candidate) => {
	try {
		return (
			(
				JSON.parse(readFileSync(join(candidate, "package.json"), "utf8")) as {
					name?: string;
				}
			).name === "reelvault-sdk"
		);
	} catch {
		return false;
	}
});

if (!sdkDir) {
	console.log(
		"reelvault-sdk sources not found — check out the ReelVault server next to this repository or set REELVAULT_SDK_PATH.",
	);
	process.exit(0);
}

const link = join(root, "node_modules/reelvault-sdk");
mkdirSync(join(root, "node_modules"), { recursive: true });
rmSync(link, { force: true, recursive: true });
symlinkSync(sdkDir, link, "dir");
console.log(`Linked reelvault-sdk → ${sdkDir}`);
