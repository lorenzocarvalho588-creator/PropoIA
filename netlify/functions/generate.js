exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key não configurada no Netlify." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido." }) };
  }

  const { template, clientName, company, service, objective, scope, deadline, value, notes, companyName } = body;

  const prompt = `Você é um especialista em propostas comerciais brasileiras. Crie uma proposta profissional, persuasiva e completa no formato JSON abaixo.

DADOS DO PROJETO:
- Empresa prestadora: ${companyName || "Nossa Empresa"}
- Template/Categoria: ${template || "Serviços"}
- Cliente: ${clientName || "Cliente"}${company ? ` (${company})` : ""}
- Serviço: ${service}
- Objetivo: ${objective || "não informado"}
- Escopo: ${scope || "não informado"}
- Prazo: ${deadline || "a combinar"}
- Valor: ${value || "a combinar"}
- Observações: ${notes || "nenhuma"}

INSTRUÇÕES:
- Escreva em português brasileiro formal e profissional
- Seja persuasivo, específico e orientado a resultados
- Use o nome do cliente no texto quando fizer sentido
- Adapte o tom ao template informado

Retorne APENAS o JSON abaixo, sem markdown, sem comentários, sem texto extra:

{
  "coverTitle": "título impactante",
  "coverSubtitle": "subtítulo complementar",
  "presentation": "parágrafos de apresentação",
  "objectives": ["objetivo 1", "objetivo 2", "objetivo 3", "objetivo 4"],
  "scope": ["entrega 1", "entrega 2", "entrega 3", "entrega 4", "entrega 5"],
  "timeline": [
    {"phase": "Fase 1", "duration": "Semana 1-2", "description": "descrição"},
    {"phase": "Fase 2", "duration": "Semana 3-4", "description": "descrição"},
    {"phase": "Fase 3", "duration": "Semana 5-6", "description": "descrição"}
  ],
  "investmentIntro": "introdução ao investimento",
  "investmentItems": [
    {"item": "item 1", "value": "R$ valor"},
    {"item": "item 2", "value": "R$ valor"}
  ],
  "investmentTotal": "valor total",
  "benefits": ["benefício 1", "benefício 2", "benefício 3", "benefício 4", "benefício 5"],
  "differentials": ["diferencial 1", "diferencial 2", "diferencial 3"],
  "nextSteps": ["passo 1", "passo 2", "passo 3", "passo 4"],
  "closing": "parágrafo de encerramento"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return { statusCode: 502, body: JSON.stringify({ error: "Erro na API da IA." }) };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/gi, "").trim();
    const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
    const content = JSON.parse(s !== -1 ? clean.slice(s, e + 1) : clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno na função." }),
    };
  }
};
