// Cliente mínimo para la API de embeddings de Voyage AI — Anthropic no genera
// embeddings, por eso hace falta un proveedor aparte (ver conversación con el
// cliente). Doc: https://docs.voyageai.com/reference/embeddings-api
// voyage-4 devuelve 1024 dimensiones por defecto (ver migración 0004).

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-4";

type VoyageInputType = "query" | "document";

async function embed(input: string[], inputType: VoyageInputType): Promise<number[][]> {
  const resp = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ input, model: MODEL, input_type: inputType }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Voyage embeddings error ${resp.status}: ${body}`);
  }

  const data = (await resp.json()) as { data: { embedding: number[]; index: number }[] };
  // La API no garantiza el orden de vuelta — se reordena por `index` para que
  // calce 1:1 con el array de `input` que se mandó.
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export function embedDocumentChunks(chunks: string[]): Promise<number[][]> {
  return embed(chunks, "document");
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vector] = await embed([query], "query");
  return vector;
}
