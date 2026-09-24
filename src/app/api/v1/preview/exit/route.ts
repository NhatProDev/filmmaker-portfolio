import { draftMode } from "next/headers";

// Leaves preview mode and returns to a site path (never another origin).
export async function GET(request: Request) {
  const to = new URL(request.url).searchParams.get("to") ?? "/";
  const location = /^\/(?![/\\])[^\s]*$/.test(to) && to.length <= 500 ? to : "/";
  (await draftMode()).disable();
  return new Response(null, { status: 307, headers: { location, "cache-control": "no-store" } });
}
