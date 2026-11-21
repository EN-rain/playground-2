import { NextResponse } from "next/server";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  // Schedule process exit so the response can be sent first
  setTimeout(() => {
    console.warn("\n[CPU Kill Switch] CPU overload detected. Terminating dev server.\n");
    process.exit(1);
  }, 100);

  return NextResponse.json({ ok: true, message: "Dev server shutting down." });
}
