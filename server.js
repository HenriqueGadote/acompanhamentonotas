// ─────────────────────────────────────────────────────────────────────────
// Proxy de IA para o painel de Notas Fiscais
// Guarda a chave da Anthropic no servidor (nunca no navegador) e expõe
// um único endpoint que o painel HTML chama para gerar a análise.
// ─────────────────────────────────────────────────────────────────────────
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // libera acesso de qualquer origem (o painel roda no GitHub Pages, por exemplo)
app.use(express.json({ limit: "200kb" }));

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PANEL_TOKEN = process.env.PANEL_TOKEN || ""; // opcional: uma senha simples pra evitar uso indevido do endpoint
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

if (!ANTHROPIC_API_KEY) {
  console.warn("⚠ ANTHROPIC_API_KEY não configurada. Configure essa variável no Railway (aba Variables) antes de usar.");
}

// Health check simples — útil pra conferir se o deploy subiu certo
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "nf-dashboard-ai-proxy",
    keyConfigured: Boolean(ANTHROPIC_API_KEY),
    tokenRequired: Boolean(PANEL_TOKEN),
  });
});

app.post("/api/ai-analysis", async (req, res) => {
  try {
    if (PANEL_TOKEN) {
      const sent = req.get("x-panel-token") || "";
      if (sent !== PANEL_TOKEN) {
        return res.status(401).json({ error: "Token inválido." });
      }
    }
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Servidor sem ANTHROPIC_API_KEY configurada." });
    }

    const summary = (req.body && req.body.summary ? String(req.body.summary) : "").slice(0, 8000);
    if (!summary.trim()) {
      return res.status(400).json({ error: "Resumo de dados vazio." });
    }

    const prompt =
      "Você é um analista financeiro lendo um painel de acompanhamento de notas fiscais de uma empresa de logística. " +
      "Com base neste resumo, escreva uma análise curta e direta em português do Brasil (3 a 5 parágrafos curtos, sem repetir os números como lista): " +
      "(1) panorama geral em uma frase, (2) os pontos que merecem atenção imediata e por quê, (3) uma sugestão prática do que priorizar hoje. " +
      "Seja específico citando departamentos e NFs quando fizer sentido. Dados:\n\n" + summary;

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      const msg = (data && data.error && data.error.message) || `Erro ${upstream.status} na API da Anthropic.`;
      return res.status(upstream.status).json({ error: msg });
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return res.json({ text });
  } catch (err) {
    console.error("Erro em /api/ai-analysis:", err);
    return res.status(500).json({ error: "Falha inesperada no servidor: " + (err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`nf-dashboard-ai-proxy rodando na porta ${PORT}`);
});
