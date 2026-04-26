#!/usr/bin/env node
/**
 * SkinGuide MCP Server
 *
 * Model Context Protocol server for skincare product discovery
 * using the Baumann Skin Type system.
 *
 * All product data is fetched live from https://skinguide.beauty/api/products.
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
    instructions: 'Search skincare products by Baumann skin type, product category, and budget. Find the perfect products for your skin type among 16 different skin type profiles.',
  }
);

log('🚀 Initializing SkinGuide MCP Server');

/**
 * Tool: search_products
 * Search skincare products by skin type characteristics and budget
 */
server.tool(
  'search_products',
  'Search skincare products by type, skin type, brand, budget, keyword, and ingredient. Results are sorted by rating (best-rated first). Returns products with name, brand, price, link, image, and compatible skin types. The response also includes available_without_ingredient_filter when the ingredient filter is used.\n\nIMPORTANT USAGE NOTES:\n- If total=0, the filters were too narrow — retry with fewer filters (remove ingredient, remove budget, etc.).\n- \'ingredient\' requires an exact text match in the stored ingredient list. Many products have incomplete ingredient data, so ingredient searches often return 0. If ingredient returns 0, retry using keyword=<ingredient_name> instead (e.g. keyword="vitamin e").\n- \'skinType\' must be a 4-letter Baumann code such as OSPT, DSPW, ORNW — NOT natural language like "sensitive" or "oily skin".\n- \'keyword\' searches product names and tags and is a reliable fallback for ingredient concepts.\n- When total=0 with an ingredient filter, check available_without_ingredient_filter to see how many products matched the other filters — if > 0, retry with keyword instead of ingredient.',
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
  'Get detailed information about a specific Baumann skin type (e.g., ORPW, DSNT). Returns the title, full name, short description, long description, characteristics, and routine description.',
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
  'List all 16 Baumann skin types with their titles, names, short descriptions, and long descriptions. Useful for understanding the skin type classification system.',
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
  'Get a list of all available skincare brands in the SkinGuide product catalog.',
  {},
  async () => {
    try {
      log('🏪 Executing get_brands');
      const result = await getBrands();
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
  'Get the skincare routine steps for a specific Baumann skin type. Returns step-by-step instructions including product type, action, and time of day (AM/PM). Can filter by gender and time of day.',
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
  'Submit answers for the Baumann skin type test and compute the final 4-letter skin type code (e.g. DSNT, ORPW). Requires authentication: pass the Firebase ID token in the Authorization header as \'Bearer <token>\'. Saves the result to the user\'s profile. Returns the skin type code, a score breakdown per dimension, and optional flags for acne and dark spots.',
  {
    answers: z.array(
      z.object({
        questionId: z
          .string()
          .describe("The question identifier returned by get_test_questions (zero-based index as string, e.g. '0', '1', '2')."),
        value: z
          .number()
          .describe('The numeric score of the chosen answer option.'),
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
