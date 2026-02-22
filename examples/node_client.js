#!/usr/bin/env node
/**
 * SkinGuide MCP Server — Node.js Example Client
 * ================================================
 * Spawns the MCP stdio server as a child process and communicates
 * over stdin/stdout using the MCP JSON-RPC 2.0 protocol.
 *
 * Usage
 *   node examples/node_client.js
 *
 * No extra dependencies — uses only Node.js built-ins (>= 18).
 */

import { spawn }        from 'child_process';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER    = resolve(__dirname, '../stdio.js');

// ── MCP stdio client ──────────────────────────────────────────────────────────

class McpClient {
  constructor() {
    this.proc    = null;
    this.pending = new Map();
    this.nextId  = 1;
  }

  start() {
    this.proc = spawn(process.execPath, [SERVER], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    const rl = createInterface({ input: this.proc.stdout });
    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.id != null && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else           resolve(msg.result);
        }
      } catch { /* ignore non-JSON lines */ }
    });
    return this;
  }

  _send(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(
        JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n',
      );
    });
  }

  _notify(method, params = {}) {
    this.proc.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n',
    );
  }

  async initialize() {
    const result = await this._send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities:    {},
      clientInfo:      { name: 'node-client', version: '1.0.0' },
    });
    this._notify('notifications/initialized');
    return result;
  }

  async callTool(name, args = {}) {
    const result = await this._send('tools/call', { name, arguments: args });
    if (result.isError) throw new Error(result.content[0].text);
    return JSON.parse(result.content[0].text);
  }

  stop() { this.proc.stdin.end(); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function section(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

// ── Demos ─────────────────────────────────────────────────────────────────────

async function demoListSkinTypes(client) {
  section('list_skin_types — all 16 Baumann skin types');
  const data = await client.callTool('list_skin_types');
  for (const t of data.skinTypes) {
    const stars = '★'.repeat(t.difficulty) + '☆'.repeat(5 - t.difficulty);
    console.log(`  ${t.code}  ${t.name.padEnd(44)} ${stars}`);
  }
  console.log(`\n  Total: ${data.total} types`);
}

async function demoGetProductTypes(client) {
  section('get_product_types — available categories');
  const data = await client.callTool('get_product_types');
  const ids  = data.productTypes.map(pt => pt.id);
  // Print in 3 columns
  for (let i = 0; i < ids.length; i += 3) {
    console.log(
      '  ' + ids.slice(i, i + 3).map(s => s.padEnd(28)).join(''),
    );
  }
  console.log(`\n  Total: ${data.total} categories`);
}

async function demoGetSkinTypeInfo(client) {
  section('get_skin_type_info — OSPT');
  const info = await client.callTool('get_skin_type_info', { skinType: 'OSPT' });
  console.log(`  Code       : ${info.code}`);
  console.log(`  Name       : ${info.name}`);
  console.log(`  Category   : ${info.category}`);
  console.log(`  Difficulty : ${'★'.repeat(info.difficulty)}${'☆'.repeat(5 - info.difficulty)} (${info.difficulty}/5)`);
  console.log(`  Description: ${info.description}`);
}

async function demoSearchProductsUS(client) {
  section('search_products — oily + sensitive (od=O, sr=S), budget $30, US');
  const data = await client.callTool('search_products', {
    od: 'O', sr: 'S', budget: 30, limit: 5,
  });
  console.log(`  ${data.total} products found\n`);
  for (const p of data.products) {
    console.log(`  [${p.type.padEnd(28)}]  $${String(p.price.toFixed(2)).padStart(6)}`);
    console.log(`    ${p.brand}  —  ${p.name.slice(0, 70)}`);
  }
}

async function demoSearchProductsUAE(client) {
  section('search_products — Moisturizer, country=UAE, limit 5');
  const data = await client.callTool('search_products', {
    type: 'Moisturizer', country: 'UAE', limit: 5,
  });
  console.log(`  ${data.total} products found\n`);
  for (const p of data.products) {
    console.log(`  ${p.brand.padEnd(20)}  $${String(p.price.toFixed(2)).padStart(6)}  ${p.name.slice(0, 50)}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nSkinGuide MCP Server — Node.js client demo');
  console.log(`Server: ${SERVER}`);

  const client = new McpClient().start();
  await client.initialize();

  try {
    await demoListSkinTypes(client);
    await demoGetProductTypes(client);
    await demoGetSkinTypeInfo(client);
    await demoSearchProductsUS(client);
    await demoSearchProductsUAE(client);
    console.log('\n✅  All demos complete.\n');
  } catch (err) {
    console.error(`\n[FATAL] ${err.message}`);
    process.exit(1);
  } finally {
    client.stop();
  }
}

main();
