export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface GeminiResponse {
  message: string;
  alternativas: string[];
}

const GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
];

/**
 * Genera una respuesta técnica interactiva utilizando Google AI Studio (Gemini).
 * Utiliza HTTP REST nativo para máxima velocidad y cero dependencias pesadas.
 */
export async function generarRespuestaGemini(
  systemInstruction: string,
  userPrompt: string,
  history: ChatHistoryItem[] = []
): Promise<GeminiResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY no está configurada en las variables de entorno.");
  }

  // Mapear historial al formato de Gemini (user / model)
  const contents = [
    ...history
      .filter((h) => h && typeof h.content === "string" && h.content.trim())
      .map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content.trim() }],
      })),
    {
      role: "user",
      parts: [{ text: userPrompt }],
    },
  ];

  let lastError: unknown = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // Configuración ultrarrápida: sin tiempo de reflexión (thinkingBudget: 0) y max 600 tokens
      const requestBody: any = {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      };

      let response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(4500), // Timeout ágil de 4.5s por modelo
      });

      let data = await response.json().catch(() => null);

      // Si el modelo rechaza thinkingConfig (HTTP 400), reintentar de inmediato sin thinkingConfig
      if (response.status === 400 && data?.error?.message?.toLowerCase().includes("thinking")) {
        delete requestBody.generationConfig.thinkingConfig;
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(4500),
        });
        data = await response.json().catch(() => null);
      }

      if (!response.ok || data?.error) {
        const errorMsg = data?.error?.message || `HTTP ${response.status} en ${model}`;
        console.warn(`[gemini] Error con modelo ${model}:`, errorMsg);
        lastError = new Error(errorMsg);
        continue;
      }

      // Extraer de forma segura la parte que contiene texto
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p: any) => typeof p?.text === "string" && p.text.trim());
      const rawAnswer = textPart?.text;

      if (!rawAnswer || typeof rawAnswer !== "string") {
        throw new Error(`Respuesta vacía o sin texto en ${model}`);
      }

      let answer = rawAnswer.trim();
      let alternativas: string[] = [];

      const matchAlt = answer.match(/<<<ALTERNATIVAS:\s*(\[[\s\S]*?\])>>>/);
      if (matchAlt) {
        try {
          alternativas = JSON.parse(matchAlt[1]);
        } catch (e) {
          console.warn("[gemini] No se pudo parsear JSON de alternativas de Gemini:", e);
        }
        answer = answer.replace(/<<<ALTERNATIVAS:\s*\[[\s\S]*?\]>>>/, "").trim();
      }

      return {
        message: answer,
        alternativas: Array.isArray(alternativas) ? alternativas : [],
      };
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] Falla al invocar ${model}:`, err);
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta de Google Gemini.");
}
