# skinguide-mcp-server

> **MCP server for SkinGuide: search skincare products by Baumann skin type, product category, budget, and ingredients. Exposes AI-friendly endpoints for dry, oily, sensitive, and all other skin types.**

[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/protocol-MCP%202024--11--05-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)
[![Website](https://img.shields.io/badge/website-skinguide.beauty-pink)](https://skinguide.beauty/)

| | |
|---|---|
| Website | [skinguide.beauty](https://skinguide.beauty/) |
| GitHub | [robertozerbini/skinguide-mcp-server](https://github.com/robertozerbini/skinguide-mcp-server) |
| Protocol | [Model Context Protocol 2024-11-05](https://modelcontextprotocol.io/) |
| Transports | stdio (npx) |

---

## Table of Contents

- [Overview](#overview)
- [Tools](#tools)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Tool Reference and Examples](#tool-reference-and-examples)
  - [list_skin_types](#list_skin_types)
  - [get_product_types](#get_product_types)
  - [get_skin_type_info](#get_skin_type_info)
  - [search_products](#search_products)
  - [get_routine](#get_routine)
  - [get_brands](#get_brands)
  - [get_test_questions](#get_test_questions)
- [Baumann Skin Type System](#baumann-skin-type-system)
- [AI Agent Integration](#ai-agent-integration)
- [Direct API Usage (Python)](#direct-api-usage-python)
- [Google Colab Notebook](#google-colab-notebook)
- [Example Clients](#example-clients)
- [API Discovery](#api-discovery)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SkinGuide MCP Server implements the [Model Context Protocol](https://modelcontextprotocol.io/) to expose skincare product search and skin type information as structured AI tools.

AI agents, LLM applications, and developer tools can:

- **Discover** all 16 Baumann skin types and their characteristics
- **Search** a curated skincare product catalogue filtered by skin type, category, budget, ingredients, and keywords
- **Recommend** personalised routines based on Baumann axes (O/D, S/R, P/N, W/T)

---

## Tools

| Tool | Description |
|---|---|
| `search_products` | Search products by skin type, brand, category, budget, keyword, and ingredient |
| `get_skin_type_info` | Detailed info for a Baumann skin type code |
| `list_skin_types` | All 16 Baumann codes with names, categories, and descriptions |
| `get_product_types` | All available product categories |
| `get_routine` | Step-by-step skincare routine for a Baumann skin type (AM/PM, gender) |
| `get_brands` | All available brands in the database |
| `get_test_questions` | All Baumann skin type quiz questions (grouped by dimension) |

---

## Repository Structure

```
skinguide-mcp-server/
├── Dockerfile             # Optional containerized runtime
├── src/
│   ├── index.ts           # MCP stdio entry-point (TypeScript)
│   ├── tools.ts           # Tool handlers + live API proxy
│   └── types.ts           # Shared interfaces/types
├── dist/                  # Compiled output (generated)
├── package.json
├── tsconfig.json
├── examples/
│   ├── blogcreation.ipynb # Colab notebook: autonomous blog-writing agent
│   ├── direct_api_client.py
│   ├── node_client.js     # Node.js demo (built-in fetch)
│   └── python_client.py   # Python MCP stdio demo
└── .well-known/
    └── mcp.json           # MCP discovery document
```

---

## Quick Start

### Run locally (recommended for development)

```bash
npm install
npm start
```

### Run via npx (published package)

No installation required. The MCP server runs on-demand via `npx` and fetches live product data from `https://skinguide.beauty/api/products`.

### Run with Docker

```bash
docker build -t skinguide-mcp .
docker run -i --rm skinguide-mcp
```

### Connect to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skinguide": {
      "command": "npx",
      "args": ["skinguide-mcp-server"]
    }
  }
}
```

### Connect to Cursor

Edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "skinguide": {
      "command": "npx",
      "args": ["skinguide-mcp-server"]
    }
  }
}
```

### Connect via VS Code with GitHub Copilot

Edit `.vscode/mcp.json`:

```json
{
  "servers": {
    "skinguide": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

### Verify

```bash
curl https://skinguide.beauty/.well-known/mcp.json
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LIVE_API_URL` | `https://skinguide.beauty/api` | Base URL for the live SkinGuide API |

---

## Tool Reference and Examples

All tools are invoked by the MCP client (Claude, Cursor, VS Code) over stdio. The JSON-RPC 2.0 envelope used internally:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": {}
  }
}
```

### list_skin_types

List all 16 Baumann skin types. Input: none.

Response excerpt:

```json
{
  "skinTypes": [
    {
      "code": "DSPW",
      "name": "Dry, Sensitive, Pigmented, Wrinkled",
      "category": "dry-sensitive",
      "difficulty": 5,
      "description": "The most complex skin type. Needs rich hydration, anti-inflammatory care, brightening, and anti-aging support simultaneously."
    },
    {
      "code": "DSNW",
      "name": "Dry, Sensitive, Non-pigmented, Wrinkled",
      "category": "dry-sensitive",
      "difficulty": 4,
      "description": "Dry and sensitive with visible aging but even tone. Prioritise deep hydration, barrier repair, and anti-aging actives."
    }
  ],
  "total": 16
}
```

_(14 more types omitted — all 16 returned in the real response)_

### get_product_types

List all available product categories. Input: none.

```json
{
  "productTypes": [
    { "id": "Acne Treatment" },
    { "id": "Anti-age Product" },
    { "id": "Anti-inflammatory Product" },
    { "id": "Antioxidant Serum" },
    { "id": "Cleanser" },
    { "id": "Eye Cream" },
    { "id": "Facial Water" },
    { "id": "Foundation" },
    { "id": "Mask" },
    { "id": "Moisturizer" },
    { "id": "Moisturizer Night" },
    { "id": "Oil-control Product" },
    { "id": "Scrub" },
    { "id": "Self-tanning" },
    { "id": "Skin Lightener" },
    { "id": "Sunscreen" }
  ],
  "total": 16
}
```

### get_skin_type_info

Input: `skinType` (string, required) — 4-letter Baumann code, e.g. `OSPT`, `DRNT`, `DSPW`.

Response:

```json
{
  "code": "OSPT",
  "name": "Oily, Sensitive, Pigmented, Tight",
  "category": "oily-sensitive",
  "difficulty": 4,
  "description": "Very common in teens and young adults. Oily, acne-prone, and sensitive with post-inflammatory dark spots."
}
```

### search_products

> **Tip:** If `total=0`, retry with fewer filters. If `ingredient` returns 0, try `keyword=<ingredient_name>` instead — many products have incomplete ingredient data. `skinType` must be a 4-letter Baumann code (e.g. `OSPT`), not natural language.

Input parameters:

| Parameter | Type | Description |
|---|---|---|
| `type` | string | Product category — one of the 16 values returned by `get_product_types` |
| `skinType` | string | 4-letter Baumann code, e.g. `OSPT`. Do NOT use natural language like "oily". |
| `od` | "O" or "D" | Oily or Dry axis |
| `sr` | "S" or "R" | Sensitive or Resistant axis |
| `pn` | "P" or "N" | Pigmented or Non-pigmented axis |
| `wt` | "W" or "T" | Wrinkled or Tight axis |
| `brand` | string | Filter by brand name (partial match, case-insensitive). E.g. `CeraVe`, `La Roche`. |
| `keyword` | string | Search keyword matched against product name and tags. Use as fallback when `ingredient` returns 0. |
| `ingredient` | string | Exact text match against the stored ingredient list. Returns 0 when data is incomplete — use `keyword` instead. |
| `budget` | number | Maximum price in dollars (use 5, 10, 20, 50, 100, or 101 for over $100) |
| `limit` | integer | Max results, 1–50 (default 50) |

When `ingredient` is used, the response includes `available_without_ingredient_filter` — the number of products that matched all other filters before the ingredient check. If that value is > 0 but `total` is 0, retry with `keyword` instead.

Example — oily + sensitive skin (`od=O`, `sr=S`), budget $30:

```json
{ "od": "O", "sr": "S", "budget": 30, "limit": 5 }
```

Example — search by skin type with ingredient fallback to keyword:

```json
{ "skinType": "OSPT", "keyword": "niacinamide", "limit": 10 }
```

Response:

```json
{
  "total": 5,
  "query": { "type": "all", "skinType": null, "od": "O", "sr": "S", "pn": null, "wt": null, "budget": 30, "keyword": null, "ingredient": null },
  "products": [
    {
      "id": 534,
      "name": "Persa-Gel 10 Oil-Free Acne Spot Treatment",
      "brand": "Clean & Clear",
      "type": "Treatment",
      "price": 5.97,
      "currency": "$",
      "vegan": false,
      "ingredients": ["Benzoyl Peroxide 10%"],
      "image": "https://m.media-amazon.com/images/I/612wW4IikOL._AC_UL320_.jpg",
      "link": "https://amzn.to/4aTFj3m",
      "country": "US",
      "skinTypes": ["OSPT"]
    }
  ]
}
```

### get_routine

Get the step-by-step skincare routine for a Baumann skin type.

Input parameters:

| Parameter | Type | Description |
|---|---|---|
| `skinType` | string, **required** | 4-letter Baumann code, e.g. `OSPT` |
| `gender` | "male" or "female" | Optional — filter steps by gender |
| `timeOfDay` | "AM" or "PM" | Optional — filter to morning or evening steps |

Example — AM routine for OSPT:

```json
{ "skinType": "OSPT", "timeOfDay": "AM" }
```

Response:

```json
{
  "skinType": "OSPT",
  "total": 4,
  "steps": [
    { "step": 1, "productType": "Cleanser",    "action": "Cleanse",          "timeOfDay": "AM" },
    { "step": 2, "productType": "Toner",        "action": "Tone",             "timeOfDay": "AM" },
    { "step": 3, "productType": "Serum",        "action": "Apply serum",      "timeOfDay": "AM" },
    { "step": 4, "productType": "Sunscreen",    "action": "Apply sunscreen",  "timeOfDay": "AM" }
  ]
}
```

---

### get_brands

Get all available skincare brands in the database. Input: none.

Response:

```json
{
  "total": 42,
  "brands": [
    "Acure",
    "Biossance",
    "CeraVe",
    "Clean & Clear",
    "La Roche-Posay",
    "Neutrogena"
  ]
}
```

---

### get_test_questions

Get all Baumann skin type quiz questions. Input: none.

Returns questions grouped by skin dimension (`O_D`, `S_R`, `P_N`, `W_T`), each with answer options and numeric scores.

Response excerpt:

```json
{
  "questions": [
    {
      "id": "0",
      "dimension": "O_D",
      "question": "How does your skin feel 2–3 hours after cleansing with no products applied?",
      "options": [
        { "text": "Tight and dry",        "value": 1 },
        { "text": "Comfortable",          "value": 2 },
        { "text": "Slightly shiny",       "value": 3 },
        { "text": "Very oily and shiny",  "value": 4 }
      ]
    }
  ],
  "total": 24
}
```

---

### get_skin_type_image

> ⚠️ This tool is available in the server but is **not exposed** in the current MCP discovery document. It can be re-enabled by adding it back to `.well-known/mcp.json` and `src/index.ts`.

Get illustration image URL(s) for a Baumann skin type. Returns portrait images (hosted on Firebase Storage) representing the skin type across different ethnicities.

Input parameters:

| Parameter | Type | Description |
|---|---|---|
| `skinType` | string, **required** | 4-letter Baumann code, e.g. `OSPT` |
| `race` | "Asian", "Black", "Latin", or "White" | Optional — filter to a specific ethnicity. Omit for all four. |

## Baumann Skin Type System

The Baumann Skin Type Indicator (BSTI) classifies skin along four binary axes:

| Axis | Options | Meaning |
|---|---|---|
| O/D | O = Oily, D = Dry | Sebum production |
| S/R | S = Sensitive, R = Resistant | Skin reactivity |
| P/N | P = Pigmented, N = Non-pigmented | Pigmentation tendency |
| W/T | W = Wrinkled, T = Tight | Aging / wrinkle tendency |

Combined: 16 unique types (DRNT = easiest, DSPW = most complex).

### All 16 Types

| Code | Name | Category | Difficulty |
|---|---|---|---|
| DRNT | Dry, Resistant, Non-pigmented, Tight | dry-resistant | 1 |
| DRNW | Dry, Resistant, Non-pigmented, Wrinkled | dry-resistant | 2 |
| DRPT | Dry, Resistant, Pigmented, Tight | dry-resistant | 2 |
| DRPW | Dry, Resistant, Pigmented, Wrinkled | dry-resistant | 3 |
| DSNT | Dry, Sensitive, Non-pigmented, Tight | dry-sensitive | 2 |
| DSNW | Dry, Sensitive, Non-pigmented, Wrinkled | dry-sensitive | 4 |
| DSPT | Dry, Sensitive, Pigmented, Tight | dry-sensitive | 3 |
| DSPW | Dry, Sensitive, Pigmented, Wrinkled | dry-sensitive | 5 |
| ORNT | Oily, Resistant, Non-pigmented, Tight | oily-resistant | 1 |
| ORNW | Oily, Resistant, Non-pigmented, Wrinkled | oily-resistant | 2 |
| ORPT | Oily, Resistant, Pigmented, Tight | oily-resistant | 2 |
| ORPW | Oily, Resistant, Pigmented, Wrinkled | oily-resistant | 3 |
| OSNT | Oily, Sensitive, Non-pigmented, Tight | oily-sensitive | 3 |
| OSNW | Oily, Sensitive, Non-pigmented, Wrinkled | oily-sensitive | 4 |
| OSPT | Oily, Sensitive, Pigmented, Tight | oily-sensitive | 4 |
| OSPW | Oily, Sensitive, Pigmented, Wrinkled | oily-sensitive | 5 |

---

## AI Agent Integration

The MCP server communicates over stdio and works with any AI client that supports MCP. Configure it as shown in the [Quick Start](#quick-start) section above.

For a deeper look at the JSON-RPC 2.0 request/response format used over the wire, see the demo clients in the `examples/` directory.

---

## Google Colab Notebook

A Jupyter notebook demonstrating an AI agent that writes blog posts using SkinGuide:

```
examples/blogcreation.ipynb
```

**Features:**
- Runs natively in Google Colab
- Uses LangChain + LangGraph to create an autonomous agent
- Bridges MCP server stdio with OpenAI GPT-4o for real-time product research
- Generates Markdown blog posts with real skincare recommendations

**Usage:**
1. Open the notebook in [Google Colab](https://colab.research.google.com/)
2. Add your `OPENAI_API_KEY` to Colab Secrets
3. Clone/mount the repo and run cells sequentially
4. Modify the `user_topic` variable to generate custom blog posts

---

## Direct API Usage (Python)

You can also call the live API directly without the MCP server. The API accepts POST requests with JSON payload:

```python
import requests
import json

url = "https://skinguide.beauty/api/products"

payload = {
    "type": "Moisturizer Day",
    "od": "D",              # Dry
    "sr": "S",              # Sensitive
    "budget": 20,
    "country": "US",
    "limit": 20
}

response = requests.post(url, json=payload)

print("Status Code:", response.status_code)
print("Response:", json.dumps(response.json(), indent=2))
```

**Supported parameters:**

| Parameter | Type | Description |
|---|---|---|
| `type` | string | Product category (see `get_product_types` for full list) |
| `country` | `"US"` or `"UAE"` | Country for product availability |
| `od` | `"O"` or `"D"` | Oily or Dry |
| `sr` | `"S"` or `"R"` | Sensitive or Resistant |
| `pn` | `"P"` or `"N"` | Pigmented or Non-pigmented |
| `wt` | `"W"` or `"T"` | Wrinkled or Tight |
| `budget` | number | Maximum price in dollars (5, 10, 20, 50, 100, or 101 for over $100) |
| `limit` | number | Maximum number of results (default 50) |

---

## Example Clients

Three demo clients are included in the `examples/` directory:

```bash
# Direct API client (stdlib only — no Node.js required, works in Colab)
python3 examples/direct_api_client.py

# MCP stdio clients (require Node.js + npm install)
node examples/node_client.js
python3 examples/python_client.py
```

---

## API Discovery

```
GET https://skinguide.beauty/.well-known/mcp.json
```

The document describes server name, version, URL, transport options, and all tools with full JSON Schema input/output definitions — ready for AI agent auto-discovery.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push and open a PR

Please follow [Conventional Commits](https://www.conventionalcommits.org/).

---

## License

MIT — © SkinGuide · [skinguide.beauty](https://skinguide.beauty/)
