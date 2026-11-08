# SkinGuide MCP tools - reference

Condensed from the server's README. Thirteen tools are exposed. Parameters not
marked **required** are optional.

## Skin types

### list_skin_types
- **Input:** none.
- **Returns:** all 16 Baumann types - `code`, `name`, `category`, `difficulty`, `description`.
- **Use when:** the user wants an overview of skin types, or you need to map a description to a code.

### get_skin_type_info
- **Input:** `skinType` (**required**) - 4-letter Baumann code, e.g. `OSPT`.
- **Returns:** `code`, `name`, `category`, `difficulty`, `description` for that type.
- **Use when:** the user knows or has just learned their type and wants it explained.

### get_test_questions
- **Input:** none.
- **Returns:** the 15 quiz questions, each with an `id`, a `section` (`O_D`, `S_R`, `P_N`, `W_T`), `text`, and `options` with a numeric `score`; plus `sectionLabels`.
- **Use when:** the user does not know their skin type.

### submit_test_answers
- **Input:** `answers` - one `{ "questionId": "<id>", "value": <score> }` per question; send all 15. `questionId` is the question `id`, `value` is the chosen option's `score`.
- **Returns:** `skinType` (4-letter code), per-axis `scores`, `acne`, `darkSpots`.
- **Requires a signed-in SkinGuide account** configured on the server. Without one it returns an error that sends the user to skinguide.beauty to take the test. Do not ask the user for credentials; send them to skinguide.beauty instead.

## Catalog

### get_product_types
- **Input:** none.
- **Returns:** the 16 product categories (e.g. `Cleanser`, `Moisturizer`, `Moisturizer Night`, `Sunscreen`, `Antioxidant Serum`, `Eye Cream`, `Mask`, `Acne Treatment`).
- **Use when:** you need a valid `type` value for `search_products` or `compare_products`.

### get_brands
- **Input:** `query` - case-insensitive substring, e.g. `"cera"`. Use it; the full list has several thousand brands.
- **Returns:** `total` and `brands`.

### search_products
- **Input:**
  - `type` - one of the categories from `get_product_types`
  - `skinType` - 4-letter Baumann code; never natural language like "oily"
  - `od` (`O`/`D`), `sr` (`S`/`R`), `pn` (`P`/`N`), `wt` (`W`/`T`) - single axes
  - `brand` - partial, case-insensitive
  - `keyword` - matched against product name and tags
  - `ingredient` - exact match against the stored ingredient list
  - `budget` - max price in dollars (5, 10, 20, 50, 100, or 101 for over $100)
  - `country` - `US` (default) or `AE`; aliases UAE->AE, USA->US
  - `sort` - `price-asc`, `price-desc` or `rating-desc` (slow, few rated products); omit for lowest price first
  - `limit` - 1-50 (default 50)
- **Returns:** `total` (matches in the whole catalog), `returned`, the echoed `query`, and `products` with `id`, `name`, `brand`, `type`, `price`, `currency`, `vegan`, `ingredients`, `image`, `link` (affiliate), `country`, `skinTypes`. With `ingredient`, also `available_without_ingredient_filter`.
- **Fallbacks:** `total` 0 -> fewer filters. `ingredient` gives 0 but `available_without_ingredient_filter` > 0 -> retry with `keyword`.

### compare_products
- **Input:** `type` (**required**), `skinType`, `country` (`US` default / `AE`), `budget`, `sortBy` (`rating` - slow - or `price`; omit for lowest price first), `limit` (2-5, default 3).
- **Returns:** the top-N products of that category, structured for side-by-side comparison.
- **Use when:** "which cleanser should I pick", "cheapest sunscreen for my type".

### get_product_reviews
- **Input:** `product_id` (**required**, from `search_products`), `sort` (`recent` default, or `rating`), `limit` (default 50, max 100).
- **Returns:** `reviews` with `rating`, `comment`, `userSkinType`, `userAgeRange`, `createdAt`. If rating sort fails upstream, reviews are sorted locally and a `_note` says so.

### get_product_ingredients
- **Input:** `product_id` (**required**, from `search_products`).
- **Returns:** `total` and `ingredients` (INCI names).
- **Use when:** "what is in this product". Follow up with `get_ingredient_info` for a single ingredient.

### get_ingredient_info
- **Input:** `slug` (kebab-case, e.g. `hyaluronic-acid`) or `name` (e.g. `Niacinamide`); at least one.
- **Returns:** `found`; if true, `ingredient` with `name`, `slug`, `also_called`, `what_it_does`, `all_functions`, `comedogenicity`, `irritancy`, `our_take`, `source_url`, plus `_data_credit`. Unknown ingredient -> `found: false`.
- **Rule:** these fields come from Incidecoder (INKEEDecoder). Credit Incidecoder and include `source_url` when you present them.

## Routines

### get_routine
- **Input:** `skinType` (**required**), `gender` (`male`/`female`), `timeOfDay` (`AM`/`PM`).
- **Returns:** `title`, `url` (the routine page on skinguide.beauty), `routineDescription`, and `steps` with `step`, `productType`, `action`, `timeOfDay`.
- **Use when:** the user wants the steps, not product picks.

### build_routine
- **Input:** `skinType` (**required**), `budget`, `budgetMode` (`per-product` default - caps each step; `total` - allocates across steps), `country` (`US` default / `AE`), `sortBy` (`rating` - slow, about 10s per step - or `price`; omit for lowest price first), `gender`, `timeOfDay`, `limit` (1-5 candidates per step, default 3).
- **Returns:** `totalSteps`, `estimatedMinCost`, and `steps`, each with `productType`, `action`, `timeOfDay`, `lowestPrice` and ranked `candidates`.
- **Use when:** the user wants a complete routine they can buy.
