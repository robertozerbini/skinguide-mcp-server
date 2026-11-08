---
name: SkinGuide skincare finder
description: Teaches an AI agent when and how to use the SkinGuide MCP server to identify a user's Baumann skin type, find skincare products by skin type, category, country and budget, build AM/PM routines, compare products, and look up ingredients.
summary: Use the SkinGuide MCP server to answer skincare questions with real catalog data - Baumann skin types, product search by type, category, budget and country (US/AE), routines with product picks, side-by-side comparisons, reviews and ingredient facts credited to Incidecoder.
version: 1.0.0
tags:
  - skincare
  - beauty
  - mcp
  - product-search
  - recommendations
  - baumann
  - routines
  - ingredients
keywords:
  - skin type
  - Baumann skin type
  - skincare routine
  - skincare products
  - moisturizer
  - sunscreen
  - cleanser
  - ingredients
  - niacinamide
  - SkinGuide
use_cases:
  - Explain what a 4-letter Baumann skin type code means
  - Find skincare products for a skin type within a budget
  - Build a morning or evening routine with product picks per step
  - Compare the cheapest or best-rated products in a category
  - Check what is in a product and what an ingredient does
  - Read user reviews from people with a similar skin type
  - Help a user who does not know their skin type find it out
docs_url: https://github.com/robertozerbini/skinguide-mcp-server
---

# SkinGuide skincare finder

This skill teaches you to answer skincare questions with live data from
[skinguide.beauty](https://skinguide.beauty) through the SkinGuide MCP server,
instead of from general knowledge. The server exposes the 16 Baumann skin
types, a skincare product catalog (US and UAE markets), routines, user reviews,
product ingredient lists and structured ingredient facts.

## Needs access to

**The SkinGuide MCP server** -
[github.com/robertozerbini/skinguide-mcp-server](https://github.com/robertozerbini/skinguide-mcp-server)
(MIT). It runs locally over stdio and reads public data from
`https://skinguide.beauty/api`. It is not published on npm; `npx` installs it
straight from GitHub. The first run takes a little longer while it installs.

Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)
or Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "skinguide": {
      "command": "npx",
      "args": ["-y", "github:robertozerbini/skinguide-mcp-server"]
    }
  }
}
```

Claude Code:

```bash
claude mcp add skinguide -- npx -y github:robertozerbini/skinguide-mcp-server
```

## When to use it

Use the SkinGuide tools whenever the user asks about:

- their skin type, or what a Baumann code such as `OSPT` or `DRNT` means
- which products to buy for their skin - by category, brand, budget, ingredient
  or country (`US` or `AE`)
- a morning (AM) or evening (PM) routine, with or without product picks
- comparing products in one category
- what is in a product, or what an ingredient does
- what other users thought of a product

## Recommended workflow

1. **Skin type unknown.** Call `get_test_questions` and walk the user through
   the 15 questions, or send them to [skinguide.beauty](https://skinguide.beauty)
   to take the free test. `submit_test_answers` only works when the server is
   connected to a signed-in SkinGuide account; if it returns an error, send the
   user to skinguide.beauty to take the test there. Never ask the user to paste
   login details of any kind into the chat. If the user only knows a trait
   ("oily", "sensitive"), you can still search by axis (`od`, `sr`, `pn`, `wt`).
2. **Skin type known.** Call `get_skin_type_info` with the 4-letter code to
   explain it, then:
   - single products -> `search_products` (pass `skinType` as the 4-letter code,
     never natural language; `type` must be one of the categories from
     `get_product_types`)
   - a whole routine -> `build_routine` (products per step plus a cost summary),
     or `get_routine` for the steps only
   - "which is best / cheapest" in one category -> `compare_products`
3. **Ingredient questions.** `get_product_ingredients` for a product's INCI
   list (by `product_id` from `search_products`), `get_ingredient_info` for what
   a single ingredient does (functions, comedogenicity, irritancy, rating).
4. **Social proof.** `get_product_reviews` for a product's reviews, which carry
   the reviewer's skin type - useful for "does this work for skin like mine".

Search tips from the server's own docs:

- If `total` is 0, retry with fewer filters.
- If an `ingredient` filter returns 0, retry with `keyword=<ingredient>` -
  many products have incomplete ingredient data. The signal is
  `available_without_ingredient_filter` above 0 while `total` is 0.
- Leave sorting at the default (lowest price first) unless the user asks for
  top-rated; rating sorts are slow (about 10s or more) and few products are rated.
- `country` defaults to `US`; use `AE` for the UAE.

See `references/tools.md` for every tool's parameters.

## Response rules

- **Only recommend products the tools returned.** Quote name, brand and price as
  returned, and say which market (US or AE) the prices are for.
- **Disclose affiliate links.** Product `link` values are affiliate links (for
  example `amzn.to`). Say so when you show them.
- **Credit Incidecoder.** When presenting data from `get_ingredient_info`, credit
  Incidecoder (INKEEDecoder) and include the `source_url` it returns.
- **Not medical advice.** Skin types and product picks are cosmetic guidance.
  For acne that scars, rashes, persistent irritation, sudden changes, or any
  medical condition, recommend seeing a dermatologist.
- Prices and availability change; present them as current at the time of the
  lookup.

## If the server is not connected

If the SkinGuide tools are not available in your session, tell the user the
skill needs the SkinGuide MCP server and show them the configuration above.
Do not invent products, prices, links, ratings or ingredient data to fill the
gap. You may still explain the Baumann system in general terms and point the
user to [skinguide.beauty](https://skinguide.beauty).

## Baumann skin types in one table

Four axes, one letter each: **O**ily / **D**ry, **S**ensitive / **R**esistant,
**P**igmented / **N**on-pigmented, **W**rinkled / **T**ight - 16 types in all,
from `DRNT` (easiest) to `DSPW` (most complex). `list_skin_types` returns all 16
with names, categories and descriptions.
