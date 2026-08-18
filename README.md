# nf-dashboard-ai-proxy

Servidor pequeno (Node/Express) que guarda a chave da Anthropic **no servidor**
e expõe um único endpoint para o painel de Notas Fiscais gerar a análise de IA
sem expor a chave no navegador.

## Rotas

- `GET /` — health check (confirma se subiu e se a chave está configurada).
- `POST /api/ai-analysis` — recebe `{ "summary": "texto..." }` e devolve `{ "text": "análise..." }`.

## Deploy no Railway (mesmo fluxo que você já usa)

1. Suba esta pasta para um repositório no GitHub (ou use o botão "Deploy from GitHub repo" do Railway apontando pra ela).
2. No Railway, crie um novo projeto a partir desse repositório.
3. Na aba **Variables**, adicione:
   - `ANTHROPIC_API_KEY` → sua chave, pegue em https://console.anthropic.com/settings/keys
   - `PANEL_TOKEN` → (opcional, recomendado) uma senha qualquer que você escolher — sem isso, qualquer pessoa que descobrir a URL pode gerar análises usando sua chave.
4. O Railway detecta o `package.json` e faz o deploy sozinho (`npm install && npm start`).
5. Depois do deploy, copie a URL pública que o Railway gerar (algo como `https://nf-dashboard-ai-proxy-production.up.railway.app`).
6. No painel HTML (`Acompanhamento_Notas_Ao_vivo.html`), abra o card **🤖 Análise inteligente (IA)** → **⚙ Configurar servidor de IA** e cole:
   - a URL do passo 5 em "URL do servidor de IA"
   - a mesma senha do `PANEL_TOKEN` em "Token" (se você configurou um)

Pronto — o painel passa a chamar seu servidor, e a chave da Anthropic nunca aparece no navegador de quem usa o painel.

## Rodando local (opcional, pra testar antes de subir)

```bash
cp .env.example .env
# edite o .env com sua chave
npm install
npm start
```

Depois teste com:

```bash
curl -X POST http://localhost:3000/api/ai-analysis \
  -H "content-type: application/json" \
  -H "x-panel-token: SEU_PANEL_TOKEN" \
  -d '{"summary":"Teste: 10 notas pendentes no departamento Manutenção."}'
```
