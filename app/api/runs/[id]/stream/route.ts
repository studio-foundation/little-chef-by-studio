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

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
