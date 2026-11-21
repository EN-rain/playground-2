import { cp, mkdir, rm } from "node:fs/promises";

const standaloneRoot = ".next/standalone";
const standaloneNextRoot = `${standaloneRoot}/.next`;

await rm(`${standaloneRoot}/public`, { recursive: true, force: true });
await rm(`${standaloneNextRoot}/static`, { recursive: true, force: true });
await mkdir(standaloneRoot, { recursive: true });
await mkdir(standaloneNextRoot, { recursive: true });
await cp("public", `${standaloneRoot}/public`, { recursive: true, force: true });
await cp(".next/static", `${standaloneNextRoot}/static`, { recursive: true, force: true });

console.log("Standalone public and static assets prepared.");
