const STUDIO_URL = process.env.NEXT_PUBLIC_API_URL;
if (!STUDIO_URL) throw new Error('NEXT_PUBLIC_API_URL is not set');

export interface RunCreated {
  run_id: string;
  status: string;
  stream_url: string;
}

export interface RecipeInput {
  dish_name: string;
  constraints: string[];
  userId: string;
}

export async function startRun(input: RecipeInput): Promise<RunCreated> {
  const res = await fetch(`${STUDIO_URL}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipeline: 'recipe-developer', input }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Studio API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<RunCreated>;
}
