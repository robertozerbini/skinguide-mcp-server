/**
 * SkinGuide MCP — Tool Handlers
 *
 * All product data is fetched live from https://skinguide.beauty/api/products.
 * Skin type info is served from local static data (the live API has no
 * skin-type endpoint).
 *
 * Live API facts (verified):
 *   GET /api/products?type=<type>&country=<country>
 *   - `type` and `country` are filtered server-side.
 *   - `budget` and skin-type axes are NOT filtered server-side → applied here.
 *   - Always returns up to 50 products per request.
 *   - Each product: { id, name, brand, type, price, currency, size,
 *                     image, link, country, skinTypes[] }
 */

const LIVE_API_URL = process.env.LIVE_API_URL ?? 'https://skinguide.beauty/api';

/* ── Product Types ───────────────────────────────────────────────────────────
   Matches the enum in https://skinguide.beauty/.well-known/mcp.json           */

export const PRODUCT_TYPES = [
  'Acne Treatment',
  'Anti-Inflammatory Moisturizing',
  'Anti-Inflammatory Product',
  'Anti-age serum',
  'Anti-inflammatory Product',
  'Antioxidant Serum',
  'At-Home Peel',
  'Benzoyl Peroxide',
  'Blushes',
  'Body Moisture',
  'Bottler',
  'Cleanser',
  'Concealers',
  'Dark Spot Treatment',
  'Exfoliation',
  'Eye Cream',
  'Face Massage',
  'Facial Peels',
  'Facial Scrub',
  'Facial Water',
  'Foundation',
  'Kits',
  'Lightening',
  'Mask',
  'Microdermabrasion',
  'Moisturizer',
  'Moisturizer Day',
  'Moisturizer Night',
  'Oil-control Powder',
  'Oil-control Product',
  'Oil-control product',
  'Pimple Medication',
  'Powder',
  'Retinol Product',
  'Scrub',
  'Self-tanning',
  'Serum',
  'Skin Lightener',
  'Spot Treatment',
  'Sulfur Mask',
  'Sunscreen',
  'Toner',
  'Wrinkle Prevention',
];

/* ── Baumann Skin Types (static — no live endpoint exists) ───────────────── */

const SKIN_TYPES = {
  DSPW: { code: 'DSPW', name: 'Dry, Sensitive, Pigmented, Wrinkled',     category: 'dry-sensitive',  difficulty: 5, description: 'The most complex skin type. Needs rich hydration, anti-inflammatory care, brightening, and anti-aging support simultaneously.' },
  DSNW: { code: 'DSNW', name: 'Dry, Sensitive, Non-pigmented, Wrinkled', category: 'dry-sensitive',  difficulty: 4, description: 'Dry and sensitive with visible aging but even tone. Prioritise deep hydration, barrier repair, and anti-aging actives.' },
  DSPT: { code: 'DSPT', name: 'Dry, Sensitive, Pigmented, Tight',        category: 'dry-sensitive',  difficulty: 3, description: 'Dry and sensitive with pigmentation issues. Focus on gentle brightening and barrier repair.' },
  DSNT: { code: 'DSNT', name: 'Dry, Sensitive, Non-pigmented, Tight',    category: 'dry-sensitive',  difficulty: 2, description: 'Dry and reactive but even-toned and firm. Needs barrier support and gentle hydration.' },
  DRPW: { code: 'DRPW', name: 'Dry, Resistant, Pigmented, Wrinkled',     category: 'dry-resistant',  difficulty: 3, description: 'Dry with pigmentation and aging. Tolerates actives well — focus on brightening and anti-aging.' },
  DRNW: { code: 'DRNW', name: 'Dry, Resistant, Non-pigmented, Wrinkled', category: 'dry-resistant',  difficulty: 2, description: 'Dry with aging concerns but even tone. Responds well to hydrating anti-aging routines.' },
  DRPT: { code: 'DRPT', name: 'Dry, Resistant, Pigmented, Tight',        category: 'dry-resistant',  difficulty: 2, description: 'Dry with pigmentation but no significant aging. Can use brightening actives safely.' },
  DRNT: { code: 'DRNT', name: 'Dry, Resistant, Non-pigmented, Tight',    category: 'dry-resistant',  difficulty: 1, description: 'The easiest dry skin type. Simply needs good hydration and moisturisation.' },
  OSPW: { code: 'OSPW', name: 'Oily, Sensitive, Pigmented, Wrinkled',    category: 'oily-sensitive', difficulty: 5, description: 'Oily yet sensitive with pigmentation and aging. A complex type needing balanced multi-target care.' },
  OSPT: { code: 'OSPT', name: 'Oily, Sensitive, Pigmented, Tight',       category: 'oily-sensitive', difficulty: 4, description: 'Very common in teens and young adults. Oily, acne-prone, and sensitive with post-inflammatory dark spots.' },
  OSNW: { code: 'OSNW', name: 'Oily, Sensitive, Non-pigmented, Wrinkled', category: 'oily-sensitive', difficulty: 4, description: 'Oily and sensitive with early aging but even tone. Focus on anti-aging while controlling oil.' },
  OSNT: { code: 'OSNT', name: 'Oily, Sensitive, Non-pigmented, Tight',   category: 'oily-sensitive', difficulty: 3, description: 'Oily and reactive but even-toned and firm. Needs oil control and anti-inflammatory care.' },
  ORPW: { code: 'ORPW', name: 'Oily, Resistant, Pigmented, Wrinkled',   category: 'oily-resistant', difficulty: 3, description: 'Oily and resilient with pigmentation and aging. Can tolerate strong actives for brightening and anti-aging.' },
  ORNW: { code: 'ORNW', name: 'Oily, Resistant, Non-pigmented, Wrinkled', category: 'oily-resistant', difficulty: 2, description: 'Oily and aging-prone but even-toned. Responds well to retinoids and oil-control routines.' },
  ORPT: { code: 'ORPT', name: 'Oily, Resistant, Pigmented, Tight',       category: 'oily-resistant', difficulty: 2, description: 'Oily with pigmentation but firm. Tolerates brightening actives well.' },
  ORNT: { code: 'ORNT', name: 'Oily, Resistant, Non-pigmented, Tight',   category: 'oily-resistant', difficulty: 1, description: 'The easiest oily skin type. Resilient, even-toned, and firm. Just needs basic oil control.' },
};

export const SKIN_TYPE_CODES = /** @type {const} */ (Object.keys(SKIN_TYPES));

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Returns true when at least one of the product's skinTypes codes satisfies
 * the requested per-axis filter (od / sr / pn / wt).
 */
function matchesSkinType(productSkinTypes, { od, sr, pn, wt }) {
  if (!od && !sr && !pn && !wt) return true;
  return productSkinTypes.some(code => {
    if (!code || code.length !== 4) return false;
    const c = code.toUpperCase();
    return (!od || c[0] === od.toUpperCase())
        && (!sr || c[1] === sr.toUpperCase())
        && (!pn || c[2] === pn.toUpperCase())
        && (!wt || c[3] === wt.toUpperCase());
  });
}

/* ── Tool: search_products ───────────────────────────────────────────────── */

/**
 * Forwards to live API then applies client-side filters for budget and skin
 * type axes (the live API only filters by `type` and `country` server-side).
 */
export async function searchProducts({
  type,
  country = 'US',   // 'US' | 'UAE'
  od, sr, pn, wt,
  budget,
  limit = 50,
} = {}) {
  const url = new URL(`${LIVE_API_URL}/products`);
  if (type)    url.searchParams.set('type', type);
  if (country) url.searchParams.set('country', country);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Live API error ${res.status}: ${res.statusText}`);

  const data = await res.json();
  let products = data.products ?? [];

  // Client-side filtering
  if (budget != null)          products = products.filter(p => p.price <= budget);
  if (od || sr || pn || wt)    products = products.filter(p => matchesSkinType(p.skinTypes ?? [], { od, sr, pn, wt }));

  products = products.slice(0, Math.min(limit, 50));

  return {
    total: products.length,
    query: {
      type:    type    ?? 'all',
      country: country ?? 'US',
      od: od ?? null, sr: sr ?? null, pn: pn ?? null, wt: wt ?? null,
      budget:  budget  ?? null,
    },
    products,
  };
}

/* ── Tool: get_skin_type_info ────────────────────────────────────────────── */

export function getSkinTypeInfo(skinType) {
  const t = SKIN_TYPES[skinType?.toUpperCase()];
  if (!t) throw new Error(`Unknown skin type "${skinType}". Valid codes: ${SKIN_TYPE_CODES.join(', ')}`);
  return t;
}

/* ── Tool: list_skin_types ───────────────────────────────────────────────── */

export function listSkinTypes() {
  const skinTypes = Object.values(SKIN_TYPES);
  return { skinTypes, total: skinTypes.length };
}

/* ── Tool: get_product_types ─────────────────────────────────────────────── */

export function getProductTypes() {
  const productTypes = PRODUCT_TYPES.map(id => ({ id }));
  return { productTypes, total: productTypes.length };
}
