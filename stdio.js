#!/usr/bin/env node
/**
 * skinguide-mcp-server — stdio transport
 *
 * Run via npx:  npx skinguide-mcp-server
 * All product data is fetched live from https://skinguide.beauty/api/products.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  PRODUCT_TYPES, SKIN_TYPE_CODES,
  searchProducts, getSkinTypeInfo, listSkinTypes, getProductTypes,
} from './api/tools.js';

const mcp = new McpServer({ name: 'skinguide-mcp-server', version: '1.0.0' });

/* ── search_products ─────────────────────────────────────────────────────── */

mcp.tool(
  'search_products',
  'Search skincare products based on skin type characteristics, product type, country, and budget. Returns products with name, brand, price, and compatible skin types.',
  {
    type:    z.enum(PRODUCT_TYPES).optional()
               .describe('Product type to search for. Call get_product_types for all options.'),
    country: z.enum(['US', 'UAE']).optional().default('US')
               .describe("Country for product availability: 'US' or 'UAE'. Defaults to 'US'."),
    od:      z.enum(['O', 'D']).optional().describe('Skin oiliness: O for Oily, D for Dry'),
    sr:      z.enum(['S', 'R']).optional().describe('Skin sensitivity: S for Sensitive, R for Resistant'),
    pn:      z.enum(['P', 'N']).optional().describe('Skin pigmentation: P for Pigmented (prone to dark spots), N for Non-pigmented'),
    wt:      z.enum(['W', 'T']).optional().describe('Skin aging: W for Wrinkled (shows aging), T for Tight (firm)'),
    budget:  z.number().positive().optional()
               .describe('Maximum price in dollars. Use 5, 10, 20, 50, or 100. Use 101 for products over $100.'),
    limit:   z.number().int().min(1).max(50).optional().default(50)
               .describe('Maximum number of products to return. Defaults to 50.'),
  },
  async (params) => {
    try {
      const result = await searchProducts(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e.message }] };
    }
  },
);

/* ── get_skin_type_info ──────────────────────────────────────────────────── */

mcp.tool(
  'get_skin_type_info',
  'Get the full name, description, category, and difficulty rating for a specific Baumann skin type code.',
  {
    skinType: z.enum(SKIN_TYPE_CODES).describe('4-letter Baumann skin type code, e.g. OSPT'),
  },
  async ({ skinType }) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(getSkinTypeInfo(skinType), null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e.message }] };
    }
  },
);

/* ── list_skin_types ─────────────────────────────────────────────────────── */

mcp.tool(
  'list_skin_types',
  'List all 16 Baumann skin types with codes, names, categories, difficulty ratings, and descriptions.',
  {},
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(listSkinTypes(), null, 2) }],
  }),
);

/* ── get_product_types ───────────────────────────────────────────────────── */

mcp.tool(
  'get_product_types',
  'List all available product categories. Use the id value as the type parameter in search_products.',
  {},
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(getProductTypes(), null, 2) }],
  }),
);

/* ── Connect ─────────────────────────────────────────────────────────────── */

const transport = new StdioServerTransport();
await mcp.connect(transport);
