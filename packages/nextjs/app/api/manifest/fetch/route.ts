import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/manifest/fetch?url=<manifestUrl>
 *
 * Server-side proxy for fetching Tollgate manifests.
 * Browsers cannot fetch manifests directly — MCP servers don't set CORS headers
 * that allow cross-origin requests from unknown origins.
 *
 * This route fetches the manifest from the Node.js server, where CORS does not apply,
 * and returns the JSON payload to the browser.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing required query parameter: url" }, { status: 400 });
  }

  // Basic URL validation — must be http/https
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Tollgate-Manifest-Fetcher/1.0",
      },
      // 8-second timeout to avoid hanging on slow servers
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Manifest server returned ${res.status} ${res.statusText}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json") && !contentType.includes("text/")) {
      return NextResponse.json(
        { error: "Manifest response is not JSON" },
        { status: 422 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch manifest: ${message}` },
      { status: 502 }
    );
  }
}
