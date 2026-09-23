#!/usr/bin/env bun
import { existsSync } from "node:fs";

const uiDir = new URL("../ui", import.meta.url).pathname;
if (!existsSync(uiDir)) {
	console.log("No ui/ directory — schema-only plugin, skipping the UI dependency install.");
	process.exit(0);
}

const proc = Bun.spawn(["bun", "install"], { cwd: uiDir, stdout: "inherit", stderr: "inherit" });
const code = await proc.exited;
process.exit(code);
