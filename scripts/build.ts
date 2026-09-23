#!/usr/bin/env bun
/**
 * Builds this plugin into `dist/<id>-<version>.zip`, ready to install through
 * **Admin → Plugins → Install from upload** (or to publish in a catalog).
 *
 *   1. bundle `index.ts` with Bun (`reelvault-sdk` stays external — the host
 *      provides the SDK itself),
 *   2. build the `ui/` bundle (vite) and compile `ui/schema*.ts` to JSON,
 *   3. patch `plugin.json` to point at the bundled entry,
 *   4. zip the plugin directory, hash it and print the checksum.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { zipSync } from "fflate";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST_DIR = join(ROOT, "dist");
const STAGING_DIR = join(DIST_DIR, ".build");
const SCHEMA_FILE_PATTERN = /^schema(-[a-z0-9]+)?\.ts$/;
const TS_EXTENSION = /\.(ts|tsx)$/;

interface PluginManifest {
	id: string;
	name: string;
	version: string;
	description?: string;
	entry: string;
	capabilities?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePluginManifest(raw: string): PluginManifest {
	const value: unknown = JSON.parse(raw);
	if (!isRecord(value)) throw new Error("plugin.json must contain a JSON object");

	const { id, name, version, entry } = value;
	if (typeof id !== "string" || typeof name !== "string" || typeof version !== "string" || typeof entry !== "string") {
		throw new Error("plugin.json is missing required string fields (id, name, version, entry)");
	}
	if (!Array.isArray(value.capabilities) || value.capabilities.length === 0) {
		throw new Error("plugin.json must declare a non-empty capabilities array");
	}

	const manifest: PluginManifest = { id, name, version, entry };
	if (typeof value.description === "string") manifest.description = value.description;
	if (value.capabilities.every((capability): capability is string => typeof capability === "string")) {
		manifest.capabilities = value.capabilities;
	}
	return manifest;
}

async function* walk(directory: string): AsyncGenerator<[string, Uint8Array]> {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			yield* walk(path);
		} else if (entry.isFile()) {
			yield [path, new Uint8Array(await readFile(path))];
		}
	}
}

async function isDirectory(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

async function run(command: string[], cwd: string): Promise<void> {
	const proc = Bun.spawn(command, { cwd, stdout: "inherit", stderr: "inherit" });
	const code = await proc.exited;
	if (code !== 0) throw new Error(`${command.join(" ")} failed (exit ${code})`);
}

async function bundleEntry(sourceDir: string, manifest: PluginManifest): Promise<string> {
	const entrySource = join(sourceDir, manifest.entry);
	const outDir = join(STAGING_DIR, "dist");
	await run(["bun", "build", entrySource, "--outdir", outDir, "--target", "bun", "--external", "reelvault-sdk"], sourceDir);
	const base = manifest.entry.split("/").pop()?.replace(TS_EXTENSION, ".js") ?? "index.js";
	return `./dist/${base}`;
}

/** Builds the frontend bundle (`ui/src/index.tsx` → `ui/dist/index.js`). */
async function buildUi(sourceDir: string): Promise<void> {
	const uiDir = join(sourceDir, "ui");
	if (!(await isDirectory(uiDir))) return;
	if (!(await Bun.file(join(uiDir, "src", "index.tsx")).exists())) {
		console.log("No ui/src/index.tsx — schema-only plugin, skipping the JS bundle.");
		return;
	}

	if (!(await isDirectory(join(uiDir, "node_modules")))) {
		await run(["bun", "install"], uiDir);
	}
	await run(["bun", "run", "build"], uiDir);
}

/** Compiles every `ui/schema*.ts` module to `ui/dist/<name>.json` for `schemaRef`. */
async function buildSchemas(sourceDir: string): Promise<void> {
	const uiDir = join(sourceDir, "ui");
	if (!(await isDirectory(uiDir))) return;

	const schemaFiles = (await readdir(uiDir, { withFileTypes: true })).filter(
		(entry) => entry.isFile() && SCHEMA_FILE_PATTERN.test(entry.name),
	);
	if (schemaFiles.length === 0) return;

	const outDir = join(uiDir, "dist");
	await mkdir(outDir, { recursive: true });
	for (const file of schemaFiles) {
		const source = join(uiDir, file.name);
		const module: unknown = await import(`${source}?build=${Date.now()}`);
		const schema = isRecord(module) && "default" in module ? module.default : undefined;
		if (!schema || typeof schema !== "object") throw new Error(`ui/${file.name} must default-export a schema object`);
		const outName = file.name.replace(TS_EXTENSION, ".json");
		await Bun.write(join(outDir, outName), `${JSON.stringify(schema, null, "\t")}\n`);
	}
}

async function stageUiAssets(sourceDir: string): Promise<void> {
	const uiDist = join(sourceDir, "ui", "dist");
	if (!(await isDirectory(uiDist))) return;
	const target = join(STAGING_DIR, "dist", "ui");
	await mkdir(target, { recursive: true });
	for await (const [path, bytes] of walk(uiDist)) {
		await Bun.write(join(target, path.slice(uiDist.length + 1)), bytes);
	}
}

async function copyIfPresent(sourceDir: string, fileName: string): Promise<void> {
	const source = join(sourceDir, fileName);
	if (await Bun.file(source).exists()) {
		await Bun.write(join(STAGING_DIR, fileName), await Bun.file(source).arrayBuffer());
	}
}

const sourceDir = ROOT;
const manifest = parsePluginManifest(await readFile(join(sourceDir, "plugin.json"), "utf8"));

await rm(STAGING_DIR, { recursive: true, force: true });
await mkdir(join(STAGING_DIR, "dist"), { recursive: true });
await rm(join(sourceDir, "ui", "dist"), { recursive: true, force: true });

const bundledEntry = await bundleEntry(sourceDir, manifest);
await buildUi(sourceDir);
await buildSchemas(sourceDir);
await stageUiAssets(sourceDir);

const stagedManifest: PluginManifest = { ...manifest, entry: bundledEntry };
await Bun.write(join(STAGING_DIR, "plugin.json"), `${JSON.stringify(stagedManifest, null, "\t")}\n`);
await copyIfPresent(sourceDir, "ui.json");
await copyIfPresent(sourceDir, "catalog.json");
await copyIfPresent(sourceDir, "README.md");
await copyIfPresent(sourceDir, "LICENSE");

await mkdir(DIST_DIR, { recursive: true });
const files: Record<string, Uint8Array> = {};
for await (const [path, bytes] of walk(STAGING_DIR)) {
	files[`${manifest.id}/${path.slice(STAGING_DIR.length + 1).replaceAll("\\", "/")}`] = bytes;
}
const zip = zipSync(files);
const checksum = `sha256-${createHash("sha256").update(zip).digest("hex")}`;
const zipName = `${manifest.id}-${manifest.version}.zip`;
await Bun.write(join(DIST_DIR, zipName), zip);
await rm(STAGING_DIR, { recursive: true, force: true });

console.log(`\nPackaged ${manifest.id}@${manifest.version}`);
console.log(`  file:     dist/${zipName}`);
console.log(`  checksum: ${checksum}`);
console.log("\nInstall it in ReelVault via Admin → Plugins → Install from upload.\n");
