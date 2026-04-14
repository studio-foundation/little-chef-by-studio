import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return new Response("NEXT_PUBLIC_API_URL is not set", { status: 500 });
  }

  const qs = req.nextUrl.searchParams.toString();
  const url = `${apiUrl}/api/runs/${id}/stream${qs ? `?${qs}` : ""}`;

  let upstream = await fetch(url, { cache: "no-store" });
  for (let attempt = 1; attempt < 5 && upstream.status === 404; attempt++) {
    await new Promise((r) => setTimeout(r, 500 * attempt));
    upstream = await fetch(url, { cache: "no-store" });
  }

  if (!upstream.ok) {
    return new Response(await upstream.text(), { status: upstream.status });
  }

  if (!upstream.body) {
    return new Response("No upstream body", { status: 502 });
  }

  const { readable, writable } = new TransformStream();
  void upstream.body.pipeTo(writable);

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
