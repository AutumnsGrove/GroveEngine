#!/usr/bin/env bun

/**
 * Looking Glass CLI entry point.
 * Run from anywhere: `looking-glass`
 */

// Resolve paths relative to this script, not cwd
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", "server.ts");

// Import and run the server
await import(serverPath);
