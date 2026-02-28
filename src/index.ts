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
    name: 'skinguide-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: 'SkinGuide MCP Server: Search skincare products by Baumann skin type, category, country, and budget.',
  }
);

log('🚀 Initializing SkinGuide MCP Server');

/**
 * Tool: search_products
 * Search skincare products by skin type characteristics and budget
 */
server.tool(
  'search_products',
  'Search skincare products based on skin type characteristics, product type, country, and budget. Returns products with name, brand, price, and compatible skin types.',
  {
    type: z
      .enum(PRODUCT_TYPES)
      .optional()
      .describe('Product type to search for. Call get_product_types for all options.'),
    country: z
      .enum(['US', 'UAE'])
      .optional()
      .default('US')
      .describe("Country for product availability: 'US' or 'UAE'. Defaults to 'US'."),
    od: z.enum(['O', 'D']).optional().describe('Skin oiliness: O for Oily, D for Dry'),
    sr: z
      .enum(['S', 'R'])
      .optional()
      .describe('Skin sensitivity: S for Sensitive, R for Resistant'),
    pn: z
      .enum(['P', 'N'])
      .optional()
      .describe('Skin pigmentation: P for Pigmented (prone to dark spots), N for Non-pigmented'),
    wt: z
      .enum(['W', 'T'])
      .optional()
      .describe('Skin aging: W for Wrinkled (shows aging), T for Tight (firm)'),
    budget: z
      .number()
      .positive()
      .optional()
      .describe('Maximum price in dollars. Use 5, 10, 20, 50, or 100. Use 101 for products over $100.'),
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
      log(`📦 Executing search_products with params: ${JSON.stringify(params)}`);
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
  'Get the full name, description, category, and difficulty rating for a specific Baumann skin type code.',
  {
    skinType: SkinTypeEnum.describe('4-letter Baumann skin type code, e.g. OSPT'),
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
  'List all 16 Baumann skin types with codes, names, categories, difficulty ratings, and descriptions.',
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
  'List all available product categories. Use the id value as the type parameter in search_products.',
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
