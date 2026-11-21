import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_MARKS = 3;

type Mark = { x: number; y: number; z: number };

function isMark(value: unknown): value is Mark {
  if (!value || typeof value !== "object") return false;
  const mark = value as Record<string, unknown>;
  return (
    typeof mark.x === "number" &&
    Number.isFinite(mark.x) &&
    typeof mark.y === "number" &&
    Number.isFinite(mark.y) &&
    typeof mark.z === "number" &&
    Number.isFinite(mark.z)
  );
}

/** Writes the last ≤3 position marks to markers.txt at the project root. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawMarks = Array.isArray((body as { marks?: unknown })?.marks)
    ? ((body as { marks: unknown[] }).marks)
    : [];
  const marks = rawMarks.filter(isMark).slice(-MAX_MARKS);

  const lines =
    marks.length === 0
      ? ["# no markers"]
      : marks.map(
          (mark, index) =>
            `M${index + 1}: ${mark.x.toFixed(2)}  ${mark.y.toFixed(2)}  ${mark.z.toFixed(2)}`,
        );

  const content = [
    "# Position marker log (max 3 — latest only)",
    `# updated: ${new Date().toISOString()}`,
    ...lines,
    "",
  ].join("\n");

  const filePath = path.join(process.cwd(), "markers.txt");
  await writeFile(filePath, content, "utf8");

  return NextResponse.json({ ok: true, count: marks.length, path: "markers.txt" });
}
