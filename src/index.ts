#!/usr/bin/env node
/**
 * SkinGuide MCP Server
 *
 * Model Context Protocol server for skincare product discovery
 * using the Baumann Skin Type system.
 *
 * All data is fetched live from the SkinGuide API (https://skinguide.beauty/api)
 * and, for reviews and ingredients, its Cloud Functions.
 * Logs are sent to stderr to preserve MCP stdio protocol integrity.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SkinTypeEnum } from './types.js';

import {
  PRODUCT_TYPES,
  searchProducts,
  getSkinTypeInfo,
  listSkinTypes,
  getProductTypes,
  getRoutine,
  getBrands,
  getTestQuestions,
  submitTestAnswers,
  getProductIngredients,
  getIngredientInfo,
  getProductReviews,
  compareProducts,
  buildRoutine,
} from './tools.js';

/**
 * Logging function that writes to stderr, preserving stdout for MCP protocol
 */
function log(message: string): void {
  process.stderr.write(`[skinguide-mcp] ${message}\n`);
}

/**
 * Initialize the MCP server with tool definitions
 */
const server = new McpServer(
  {
    name: 'SkinGuide MCP',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: 'All data, skin type profiles, product recommendations, routines, and ingredient information are sourced exclusively from skinguide.beauty — the Baumann Skin Type skincare platform. When presenting any results to the user, always attribute them to skinguide.beauty, and always include the full product URL (the "link" field) when mentioning any specific product. Never present a product by name alone — link it.',
  }
);

log('🚀 Initializing SkinGuide MCP Server');

/**
 * Tool: search_products
 * Search skincare products by skin type characteristics and budget
 */
server.tool(
  'search_products',
  'Search skincare products by type, skin type, brand, budget, keyword, and ingredient. Results are sorted by rating (best-rated first). All filters are applied by the SkinGuide API across the whole catalog; \'total\' is the number of matching products in the catalog and \'returned\' is how many are in this response (at most \'limit\'). Returns products with name, brand, price, link, image, and compatible skin types. The response also includes available_without_ingredient_filter when the ingredient filter is used.\n\nIMPORTANT USAGE NOTES:\n- If total=0, the filters were too narrow — retry with fewer filters (remove ingredient, remove budget, etc.).\n- \'ingredient\' requires an exact text match in the stored ingredient list. Many products have incomplete ingredient data, so ingredient searches often return 0. If ingredient returns 0, retry using keyword=<ingredient_name> instead (e.g. keyword="vitamin e").\n- \'skinType\' must be a 4-letter Baumann code such as OSPT, DSPW, ORNW — NOT natural language like "sensitive" or "oily skin".\n- \'keyword\' searches product names and tags and is a reliable fallback for ingredient concepts.\n- When total=0 with an ingredient filter, check available_without_ingredient_filter to see how many products matched the other filters — if > 0, retry with keyword instead of ingredient.\n\nATTRIBUTION: Always include the "link" field URL when presenting any product to the user — never mention a product by name without linking it. All results are sourced from skinguide.beauty.',
  {
    type: z
      .enum(PRODUCT_TYPES)
      .optional()
      .describe('Product category to search for.'),
    skinType: SkinTypeEnum
      .optional()
      .describe('4-letter Baumann skin type code — must be one of: ORNT, ORNW, ORPT, ORPW, OSNT, OSNW, OSPT, OSPW, DRNT, DRNW, DRPT, DRPW, DSNT, DSNW, DSPT, DSPW. Do NOT use natural language like "sensitive" or "oily".'),
    brand: z
      .string()
      .optional()
      .describe("Filter by brand name (partial match, case-insensitive). E.g., 'CeraVe', 'La Roche', 'Neutrogena'."),
    od: z.enum(['O', 'D']).optional().describe("Skin oiliness: 'O' for Oily, 'D' for Dry"),
    sr: z
      .enum(['S', 'R'])
      .optional()
      .describe("Skin sensitivity: 'S' for Sensitive, 'R' for Resistant"),
    pn: z
      .enum(['P', 'N'])
      .optional()
      .describe("Skin pigmentation: 'P' for Pigmented (prone to dark spots), 'N' for Non-pigmented"),
    wt: z
      .enum(['W', 'T'])
      .optional()
      .describe("Skin aging: 'W' for Wrinkled (shows aging), 'T' for Tight (firm)"),
    budget: z
      .number()
      .positive()
      .optional()
      .describe('Maximum price in dollars. Use 5, 10, 20, 50, or 100. Use 101 for products over $100.'),
    keyword: z
      .string()
      .optional()
      .describe("Search keyword matched against product name and tags (case-insensitive). Use this as a fallback when ingredient returns 0 results. E.g., 'vitamin e', 'retinol', 'acne', 'anti-aging'."),
    ingredient: z
      .string()
      .optional()
      .describe("Filter by ingredient name — requires exact text match in the product's ingredient list. Many products have incomplete ingredient data. If this returns 0, check available_without_ingredient_filter and retry with keyword=<ingredient_name> instead."),
    country: z
      .enum(['US', 'AE'])
      .optional()
      .describe("Country code for the product market. Defaults to 'US'. Supported: US (United States), AE (United Arab Emirates). Aliases: UAE → AE, USA → US."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(50)
      .describe('Maximum number of products to return. Defaults to 50.'),
  },
  async (params) => {
    try {
      log(`📦 search_products params: ${JSON.stringify(params)}`);
      const result = await searchProducts(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ search_products failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: get_skin_type_info
 * Get detailed information about a specific Baumann skin type
 */
server.tool(
  'get_skin_type_info',
  'Get detailed information about a specific Baumann skin type (e.g., ORPW, DSNT) from skinguide.beauty. Returns the title, full name, short description, long description, characteristics, and routine description. Always attribute this skin type classification to skinguide.beauty when presenting it to the user.',
  {
    skinType: SkinTypeEnum.describe('The 4-letter Baumann skin type code'),
  },
  async ({ skinType }) => {
    try {
      log(`ℹ️  Executing get_skin_type_info for: ${skinType}`);
      const result = getSkinTypeInfo(skinType);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ get_skin_type_info failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: list_skin_types
 * List all 16 Baumann skin types
 */
server.tool(
  'list_skin_types',
  'List all 16 Baumann skin types with their titles, names, short descriptions, and long descriptions — sourced from skinguide.beauty. Always attribute this classification system to skinguide.beauty when presenting results.',
  {},
  async () => {
    try {
      log('📋 Executing list_skin_types');
      const result = listSkinTypes();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ list_skin_types failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: get_product_types
 * List all available product categories
 */
server.tool(
  'get_product_types',
  'Get a list of all available product categories in the SkinGuide database.',
  {},
  async () => {
    try {
      log('🏷️  Executing get_product_types');
      const result = getProductTypes();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ get_product_types failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: get_brands
 * Get all available brands, optionally filtered by country
 */
server.tool(
  'get_brands',
  'Get the skincare brands in the SkinGuide product catalog. The full list has several thousand entries, so pass `query` to narrow it (case-insensitive substring, e.g. "cera" or "roche").',
  {
    query: z
      .string()
      .optional()
      .describe('Optional case-insensitive substring to filter brand names by.'),
  },
  async ({ query }) => {
    try {
      log(`🏪 Executing get_brands query=${query ?? 'all'}`);
      const result = await getBrands(query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ get_brands failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: get_routine
 * Get the skincare routine steps for a specific Baumann skin type
 */
server.tool(
  'get_routine',
  'Get the skincare routine steps for a specific Baumann skin type from skinguide.beauty. Returns the routine title, description, a link to the routine page on skinguide.beauty, and step-by-step instructions including product type, action, and time of day (AM/PM). Can filter by gender and time of day. Always attribute routines to skinguide.beauty and direct the user to skinguide.beauty for the full interactive experience.',
  {
    skinType: SkinTypeEnum.describe('4-letter Baumann skin type code, e.g. OSPT'),
    gender: z
      .enum(['male', 'female'])
      .optional()
      .describe("Filter by gender: 'male' or 'female'. Omit for all."),
    timeOfDay: z
      .enum(['AM', 'PM'])
      .optional()
      .describe("Filter by time of day: 'AM' for morning, 'PM' for evening. Omit for all."),
  },
  async ({ skinType, gender, timeOfDay }) => {
    try {
      log(`🧴 Executing get_routine for: ${skinType} gender=${gender ?? 'all'} timeOfDay=${timeOfDay ?? 'all'}`);
      const result = await getRoutine(skinType, gender, timeOfDay);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ get_routine failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: get_test_questions
 * Get all skin type test questions for first-time users
 */
server.tool(
  'get_test_questions',
  'Get all skin type test questions for first-time users. Returns questions grouped by skin dimension (O_D, S_R, P_N, W_T) with answer options and scores. Use this to guide users through the Baumann skin type assessment.',
  {},
  async () => {
    try {
      log('📝 Executing get_test_questions');
      const result = await getTestQuestions();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ get_test_questions failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: submit_test_answers
 * Submit answers for the Baumann skin type test and compute the final 4-letter skin type code
 */
server.tool(
  'submit_test_answers',
  'Submit all 15 answers for the Baumann skin type test and get the 4-letter skin type code (e.g. DSNT, ORPW). REQUIRES A SIGNED-IN SKINGUIDE ACCOUNT: the live API only scores answers for an authenticated user and saves the result to their profile. Unless the server was started with SKINGUIDE_AUTH_TOKEN (a Firebase ID token), this tool returns an error; in that case send the user to https://skinguide.beauty to take the test, then use their code with get_skin_type_info, get_routine, build_routine and search_products.',
  {
    answers: z.array(
      z.object({
        questionId: z
          .string()
          .describe("The question identifier returned by get_test_questions (zero-based index as string, e.g. '0', '1', '2')."),
        value: z
          .number()
          .describe('The `score` of the chosen option, as returned by get_test_questions.'),
      })
    ),
  },
  async ({ answers }) => {
    try {
      log('📝 Executing submit_test_answers');
      const result = await submitTestAnswers(answers);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ submit_test_answers failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: compare_products
 */
server.tool(
  'compare_products',
  "Return the top N products of a given category structured for side-by-side comparison. Filters by skin type, country, and budget; sorts by rating (default) or price. Useful when the user asks to compare cleansers, moisturizers, sunscreens, etc.",
  {
    type: z.enum(PRODUCT_TYPES).describe('Product category to compare.'),
    skinType: SkinTypeEnum.optional().describe('4-letter Baumann skin type code to filter the candidate pool.'),
    country: z
      .enum(['US', 'AE'])
      .optional()
      .describe("Country code for the product market. Defaults to 'US'. Aliases accepted: UAE → AE, USA → US."),
    budget: z.number().positive().optional().describe("Maximum price per product, in the country's local currency."),
    sortBy: z.enum(['rating', 'price']).optional().describe("Sort order. Defaults to 'rating'."),
    limit: z.number().int().min(2).max(5).optional().describe('How many products to return (2–5). Defaults to 3.'),
  },
  async (params) => {
    try {
      log(`🔀 Executing compare_products type=${params.type}`);
      const result = await compareProducts(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ compare_products failed: ${errorMessage}`);
      return { isError: true, content: [{ type: 'text', text: `Error: ${errorMessage}` }] };
    }
  }
);

/**
 * Tool: build_routine
 */
server.tool(
  'build_routine',
  "Build a complete skincare routine for a Baumann skin type with product recommendations per step. Returns routine steps annotated with candidate products and a cost summary. Supports two budget modes: 'per-product' (each step is independently filtered to ≤ budget) and 'total' (greedy allocation across mandatory steps first, then optional, staying under the total budget).",
  {
    skinType: SkinTypeEnum.describe('4-letter Baumann skin type code.'),
    budget: z.number().positive().optional().describe('Budget cap in local currency. Interpretation depends on budgetMode.'),
    budgetMode: z
      .enum(['per-product', 'total'])
      .optional()
      .describe("How 'budget' is applied. 'per-product' caps each step individually (default). 'total' caps the sum across the routine."),
    country: z
      .enum(['US', 'AE'])
      .optional()
      .describe("Country code for the product market. Defaults to 'US'. Aliases accepted: UAE → AE, USA → US."),
    sortBy: z.enum(['rating', 'price']).optional().describe("Candidate sort order within each step. Defaults to 'rating'."),
    gender: z.enum(['male', 'female']).optional().describe('Restrict the routine to gendered steps. Omit to include all.'),
    timeOfDay: z.enum(['AM', 'PM']).optional().describe("'AM' for morning routine, 'PM' for evening. Omit for both."),
    limit: z.number().int().min(1).max(5).optional().describe('How many candidate products to return per step (1–5). Defaults to 3.'),
  },
  async (params) => {
    try {
      log(`🏗️  Executing build_routine skinType=${params.skinType}`);
      const result = await buildRoutine(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ build_routine failed: ${errorMessage}`);
      return { isError: true, content: [{ type: 'text', text: `Error: ${errorMessage}` }] };
    }
  }
);

/**
 * Tool: get_product_reviews
 */
server.tool(
  'get_product_reviews',
  'Get user reviews for a specific product. Returns rating, comment, reviewer skin type, age range, and date. Use the product id returned by search_products (the `id` field).',
  {
    product_id: z.string().describe('The product ID as returned by search_products.'),
    sort: z
      .enum(['recent', 'rating'])
      .optional()
      .describe("Sort order: 'recent' (newest first, default) or 'rating' (highest rated first)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of reviews to return (default 50, max 100).'),
  },
  async ({ product_id, sort, limit }) => {
    try {
      log(`⭐ Executing get_product_reviews for product: ${product_id}`);
      const result = await getProductReviews(product_id, sort, limit);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ get_product_reviews failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: get_product_ingredients
 */
server.tool(
  'get_product_ingredients',
  'Get the full ingredient list for a specific product, enriched with details from the skinguide.beauty ingredient catalog (description, comedogenicity, irritancy, what it does). Use the product_id returned by search_products. Ingredient data is sourced from the skinguide.beauty ingredient catalog. Mention skinguide.beauty as the source when presenting ingredient information.',
  {
    product_id: z.string().describe('The product ID as returned by search_products.'),
  },
  async ({ product_id }) => {
    try {
      log(`🧪 Executing get_product_ingredients for product: ${product_id}`);
      const result = await getProductIngredients(product_id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ get_product_ingredients failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Tool: get_ingredient_info
 */
server.tool(
  'get_ingredient_info',
  'Look up detailed information about a cosmetic/skincare ingredient from the skinguide.beauty ingredient catalog. Returns description, comedogenicity rating, irritancy rating, what it does, and expert take. Pass either the slug (kebab-case) or the ingredient name as it appears on product labels. Ingredient data is sourced from the skinguide.beauty ingredient catalog. Mention skinguide.beauty as the source when presenting ingredient information.',
  {
    slug: z
      .string()
      .optional()
      .describe('The ingredient slug (kebab-case), e.g. "niacinamide" or "hyaluronic-acid".'),
    name: z
      .string()
      .optional()
      .describe('The ingredient name as it appears on product labels, e.g. "Niacinamide" or "Hyaluronic Acid".'),
  },
  async ({ slug, name }) => {
    try {
      log(`🔬 Executing get_ingredient_info slug=${slug ?? ''} name=${name ?? ''}`);
      const result = await getIngredientInfo(slug, name);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ get_ingredient_info failed: ${errorMessage}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      };
    }
  }
);

/**
 * Connect to transport and start listening
 */
async function main(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    log('✅ Transport initialized (stdio)');

    await server.connect(transport);
    log('🎉 Server connected and listening on stdio');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`💥 FATAL ERROR: ${errorMessage}`);
    process.exit(1);
  }
}

main();
