import { z } from 'zod';
import type {
  SkincareProduct,
  SearchProductsParams,
  SearchProductsResult,
  SkinTypeInfo,
  ListSkinTypesResult,
  GetProductTypesResult,
  GetRoutineResult,
  GetBrandsResult,
  GetSkinTypeImageResult,
  SkinTypeImageEntry,
  SkinTypeImageRace,
  RoutineStep,
  SkinType,
  GetTestQuestionsResult,
  SubmitTestAnswerInput,
  SubmitTestAnswersResult,
  GetProductIngredientsResult,
  GetIngredientInfoResult,
  IngredientDetail,
  GetProductReviewsResult,
  CompareProductsResult,
  BuildRoutineResult,
  RoutineStepWithProducts,
  CountryCode,
} from './types.js';

const LIVE_API_URL = process.env.LIVE_API_URL ?? 'https://skinguide.beauty/api';

/**
 * Reviews, product ingredients and ingredient info are not behind the
 * skinguide.beauty/api Hosting rewrites; they are served only as direct
 * Cloud Functions URLs.
 */
const FUNCTIONS_URL = process.env.SKINGUIDE_FUNCTIONS_URL ?? 'https://us-central1-vanity-e971f.cloudfunctions.net';

const ATTRIBUTION = {
  _source: 'skinguide.beauty',
  _website: 'https://skinguide.beauty',
  _note: 'Data provided by skinguide.beauty. When presenting products, always include the product link URL. When presenting skin type info or routines, attribute them to skinguide.beauty.',
} as const;

function wrapWithAttribution<T extends object>(result: T): T & typeof ATTRIBUTION {
  return { ...result, ...ATTRIBUTION };
}

/**
 * All available product categories
 */
export const PRODUCT_TYPES = [
  'Acne Treatment',
  'Anti-age Product',
  'Anti-inflammatory Product',
  'Antioxidant Serum',
  'Cleanser',
  'Eye Cream',
  'Facial Water',
  'Foundation',
  'Mask',
  'Moisturizer',
  'Moisturizer Night',
  'Oil-control Product',
  'Scrub',
  'Self-tanning',
  'Skin Lightener',
  'Sunscreen',
] as const;

/**
 * Get all skin type test questions for first-time users
 */
export async function getTestQuestions(): Promise<GetTestQuestionsResult> {
  const url = new URL(`${LIVE_API_URL}/testQuestions`);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Unable to fetch test questions. Live API error ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    questions?: GetTestQuestionsResult['questions'];
    total?: number;
    sections?: string[];
    sectionLabels?: Record<string, string>;
  };
  const questions = data.questions ?? [];
  return {
    questions,
    total: data.total ?? questions.length,
    sections: data.sections,
    sectionLabels: data.sectionLabels,
  };
}

/**
 * Submit answers for the Baumann skin type test.
 *
 * The live endpoint (POST /api/submitTestAnswers) requires a Firebase ID token
 * for a signed-in SkinGuide user and saves the result to that user's account.
 * The score-to-letter thresholds live server-side (Firestore `scoringRules`)
 * and are not exposed publicly, so the type cannot be computed locally without
 * hard-coding rules that could silently drift from the site's.
 *
 * Without SKINGUIDE_AUTH_TOKEN this returns a clear error instead of calling
 * the API. With it, the answers are forwarded as-is.
 */
export async function submitTestAnswers(
  answers: SubmitTestAnswerInput[]
): Promise<SubmitTestAnswersResult> {
  const authToken = process.env.SKINGUIDE_AUTH_TOKEN;
  if (!authToken) {
    throw new Error(
      'submit_test_answers requires a signed-in SkinGuide account: the live API only scores answers ' +
        'for an authenticated user and saves the result to their profile. Take the free skin type test at ' +
        'https://skinguide.beauty, then use the resulting 4-letter code with get_skin_type_info, get_routine, ' +
        'build_routine and search_products. (Advanced: set SKINGUIDE_AUTH_TOKEN to a Firebase ID token to submit from here.)'
    );
  }

  const url = new URL(`${LIVE_API_URL}/submitTestAnswers`);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ answers }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`Unable to submit test answers. Live API error ${res.status}: ${detail}`);
  }

  return wrapWithAttribution((await res.json()) as SubmitTestAnswersResult);
}

type BaseSkinTypeInfo = Pick<SkinTypeInfo, 'code' | 'name' | 'category' | 'difficulty' | 'description'>;

const SKIN_TYPES: Record<SkinType, BaseSkinTypeInfo> = {
  DSPW: { code: 'DSPW', name: 'Dry, Sensitive, Pigmented, Wrinkled', category: 'dry-sensitive', difficulty: 5, description: 'The most complex skin type. Needs rich hydration, anti-inflammatory care, brightening, and anti-aging support simultaneously.' },
  DSNW: { code: 'DSNW', name: 'Dry, Sensitive, Non-pigmented, Wrinkled', category: 'dry-sensitive', difficulty: 4, description: 'Dry and sensitive with visible aging but even tone. Prioritise deep hydration, barrier repair, and anti-aging actives.' },
  DSPT: { code: 'DSPT', name: 'Dry, Sensitive, Pigmented, Tight', category: 'dry-sensitive', difficulty: 3, description: 'Dry and sensitive with pigmentation issues. Focus on gentle brightening and barrier repair.' },
  DSNT: { code: 'DSNT', name: 'Dry, Sensitive, Non-pigmented, Tight', category: 'dry-sensitive', difficulty: 2, description: 'Dry and reactive but even-toned and firm. Needs barrier support and gentle hydration.' },
  DRPW: { code: 'DRPW', name: 'Dry, Resistant, Pigmented, Wrinkled', category: 'dry-resistant', difficulty: 3, description: 'Dry with pigmentation and aging. Tolerates actives well — focus on brightening and anti-aging.' },
  DRNW: { code: 'DRNW', name: 'Dry, Resistant, Non-pigmented, Wrinkled', category: 'dry-resistant', difficulty: 2, description: 'Dry with aging concerns but even tone. Responds well to hydrating anti-aging routines.' },
  DRPT: { code: 'DRPT', name: 'Dry, Resistant, Pigmented, Tight', category: 'dry-resistant', difficulty: 2, description: 'Dry with pigmentation but no significant aging. Can use brightening actives safely.' },
  DRNT: { code: 'DRNT', name: 'Dry, Resistant, Non-pigmented, Tight', category: 'dry-resistant', difficulty: 1, description: 'The easiest dry skin type. Simply needs good hydration and moisturisation.' },
  OSPW: { code: 'OSPW', name: 'Oily, Sensitive, Pigmented, Wrinkled', category: 'oily-sensitive', difficulty: 5, description: 'Oily yet sensitive with pigmentation and aging. A complex type needing balanced multi-target care.' },
  OSPT: { code: 'OSPT', name: 'Oily, Sensitive, Pigmented, Tight', category: 'oily-sensitive', difficulty: 4, description: 'Very common in teens and young adults. Oily, acne-prone, and sensitive with post-inflammatory dark spots.' },
  OSNW: { code: 'OSNW', name: 'Oily, Sensitive, Non-pigmented, Wrinkled', category: 'oily-sensitive', difficulty: 4, description: 'Oily and sensitive with early aging but even tone. Focus on anti-aging while controlling oil.' },
  OSNT: { code: 'OSNT', name: 'Oily, Sensitive, Non-pigmented, Tight', category: 'oily-sensitive', difficulty: 3, description: 'Oily and reactive but even-toned and firm. Needs oil control and anti-inflammatory care.' },
  ORPW: { code: 'ORPW', name: 'Oily, Resistant, Pigmented, Wrinkled', category: 'oily-resistant', difficulty: 3, description: 'Oily and resilient with pigmentation and aging. Can tolerate strong actives for brightening and anti-aging.' },
  ORNW: { code: 'ORNW', name: 'Oily, Resistant, Non-pigmented, Wrinkled', category: 'oily-resistant', difficulty: 2, description: 'Oily and aging-prone but even-toned. Responds well to retinoids and oil-control routines.' },
  ORPT: { code: 'ORPT', name: 'Oily, Resistant, Pigmented, Tight', category: 'oily-resistant', difficulty: 2, description: 'Oily with pigmentation but firm. Tolerates brightening actives well.' },
  ORNT: { code: 'ORNT', name: 'Oily, Resistant, Non-pigmented, Tight', category: 'oily-resistant', difficulty: 1, description: 'The easiest oily skin type. Resilient, even-toned, and firm. Just needs basic oil control.' },
};

export const SKIN_TYPE_CODES = Object.keys(SKIN_TYPES) as SkinType[];

/**
 * Validation schema for search_products input
 */
const COUNTRY_CODES = ['US', 'AE'] as const;

/** Normalise country aliases to canonical 2-letter codes */
function normaliseCountry(raw?: string): CountryCode | undefined {
  if (!raw) return undefined;
  const u = raw.toUpperCase().trim();
  if (u === 'UAE' || u === 'EMIRATES' || u === 'DUBAI') return 'AE';
  if (u === 'USA' || u === 'AMERICA') return 'US';
  if ((COUNTRY_CODES as readonly string[]).includes(u)) return u as CountryCode;
  return undefined;
}

const SearchProductsInputSchema = z.object({
  type: z.enum(PRODUCT_TYPES).optional(),
  skinType: z.string().optional().describe('Direct 4-letter Baumann skin type code, e.g. OSPT.'),
  brand: z.string().optional().describe('Filter by brand name (partial match, case-insensitive).'),
  od: z.enum(['O', 'D']).optional(),
  sr: z.enum(['S', 'R']).optional(),
  pn: z.enum(['P', 'N']).optional(),
  wt: z.enum(['W', 'T']).optional(),
  budget: z.number().positive().optional(),
  keyword: z.string().optional().describe('Search keyword to match against product name (case-insensitive).'),
  ingredient: z.string().optional().describe('Filter by ingredient name (partial match, case-insensitive).'),
  country: z.enum(COUNTRY_CODES).optional().describe('Country code for the product market (US, AE).'),
  limit: z.number().int().min(1).max(50).optional().default(50),
}).strict();

/**
 * Format Zod validation errors for user-friendly messages
 */
function formatValidationError(error: z.ZodError): string {
  return error.issues.map(issue => {
    const field = issue.path.length ? issue.path.join('.') : 'input';
    return `${field}: ${issue.message}`;
  }).join('; ');
}

/**
 * Check if product skin types match the requested axes
 */
function matchesSkinType(
  productSkinTypes: string[],
  { od, sr, pn, wt }: Partial<SearchProductsParams>
): boolean {
  if (!od && !sr && !pn && !wt) return true;

  return productSkinTypes.some(code => {
    if (!code || code.length !== 4) return false;
    const c = code.toUpperCase();
    return (
      (!od || c[0] === od.toUpperCase()) &&
      (!sr || c[1] === sr.toUpperCase()) &&
      (!pn || c[2] === pn.toUpperCase()) &&
      (!wt || c[3] === wt.toUpperCase())
    );
  });
}

type ProductsResponse = {
  total?: number;
  products?: SkincareProduct[];
  query?: Record<string, unknown>;
};

/** True when the API echoed a value for this filter (i.e. it applied it server-side). */
function serverApplied(query: Record<string, unknown> | undefined, key: string): boolean {
  if (!query || !(key in query)) return false;
  const v = query[key];
  return v !== 'all' && v !== 'any' && v !== null && v !== undefined;
}

async function fetchProducts(params: Record<string, string | number | undefined>): Promise<ProductsResponse> {
  const url = new URL(`${LIVE_API_URL}/products`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Live API error ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as ProductsResponse;
}

/** Server-side sort orders accepted by /api/products. */
export type ProductSort = 'rating-desc' | 'price-asc' | 'price-desc';

/**
 * Search skincare products from the live API.
 *
 * Every filter is applied server-side by /api/products, which pages its results
 * (20 rows by default, at most 100). Filtering client-side would only ever see
 * the first page, so the filters are passed as query params and `total` is the
 * server's count of all matches, not the length of the returned slice.
 *
 * As a guard, if the API response does not echo a filter back in `query`, that
 * filter is applied client-side to the returned page and `filtersAppliedLocally`
 * says so (in that case `total` can only describe the page).
 */
export async function searchProducts(
  input: unknown = {},
  opts: { sort?: ProductSort } = {}
): Promise<SearchProductsResult> {
  const parsed = SearchProductsInputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    throw new Error(`Invalid search_products arguments: ${formatValidationError(parsed.error)}`);
  }

  const { type, skinType, brand, od, sr, pn, wt, budget, keyword, ingredient, country, limit = 50 } = parsed.data;
  const pageSize = Math.min(limit, 50);

  const params = {
    type,
    brand,
    skinType: skinType?.toUpperCase(),
    od,
    sr,
    pn,
    wt,
    budget,
    keyword,
    ingredient,
    country,
    limit: pageSize,
    sort: opts.sort ?? 'rating-desc',
  };
  const data = await fetchProducts(params);
  let products = data.products ?? [];
  const q = data.query;

  // Runtime check: apply locally only the filters the server did not echo back.
  const local: string[] = [];
  if (brand && !serverApplied(q, 'brand')) {
    local.push('brand');
    const b = brand.toLowerCase();
    products = products.filter(p => p.brand?.toLowerCase().includes(b));
  }
  if (budget != null && !serverApplied(q, 'budget')) {
    local.push('budget');
    products = products.filter(p => p.price <= budget);
  }
  if ((skinType || od || sr || pn || wt) && !serverApplied(q, 'skinType')) {
    local.push('skinType');
    if (skinType) {
      const st = skinType.toUpperCase() as SkinType;
      products = products.filter(p => (p.skinTypes ?? []).includes(st));
    }
    products = products.filter(p => matchesSkinType(p.skinTypes ?? [], { od, sr, pn, wt }));
  }
  if (keyword && !serverApplied(q, 'keyword')) {
    local.push('keyword');
    const kw = keyword.toLowerCase();
    products = products.filter(p => p.name?.toLowerCase().includes(kw));
  }
  if (ingredient && !serverApplied(q, 'ingredient')) {
    local.push('ingredient');
    const ing = ingredient.toLowerCase();
    products = products.filter(p => (p.ingredients ?? []).some(i => i.toLowerCase().includes(ing)));
  }
  if (type && !serverApplied(q, 'type')) {
    local.push('type');
    products = products.filter(p => (p as SkincareProduct & { category?: string }).category === type);
  }

  products = products.slice(0, pageSize);
  const total = local.length === 0 && typeof data.total === 'number' ? data.total : products.length;

  // Documented in the tool description: when an ingredient filter is used,
  // report how many products matched the other filters alone, so the caller
  // can retry with keyword instead.
  let availableWithoutIngredient: number | undefined;
  if (ingredient) {
    const without = await fetchProducts({ ...params, ingredient: undefined, limit: 1 });
    availableWithoutIngredient = without.total ?? 0;
  }

  return wrapWithAttribution({
    _product_links_note: 'Each product has a "link" field with its full URL on skinguide.beauty. Always use this URL when presenting products — link the product name to its page.',
    total,
    returned: products.length,
    query: {
      type: type ?? 'all',
      brand: brand ?? null,
      skinType: skinType ?? null,
      od: od ?? null,
      sr: sr ?? null,
      pn: pn ?? null,
      wt: wt ?? null,
      budget: budget ?? null,
      keyword: keyword ?? null,
      ingredient: ingredient ?? null,
    },
    products,
    ...(local.length > 0 && { filtersAppliedLocally: local }),
    ...(availableWithoutIngredient !== undefined && {
      available_without_ingredient_filter: availableWithoutIngredient,
    }),
  });
}

/**
 * Return top-N products of a category for side-by-side comparison
 */
export async function compareProducts(params: {
  type: string;
  skinType?: string;
  country?: string;
  budget?: number;
  sortBy?: string;
  limit?: number;
}): Promise<CompareProductsResult> {
  const { type, skinType, budget, sortBy = 'rating', limit = 3 } = params;
  const country = normaliseCountry(params.country);
  const cappedLimit = Math.min(Math.max(limit, 2), 5);

  // Sort server-side so the top N are the top N of the whole category, not of one page.
  const result = await searchProducts(
    { type: type as typeof PRODUCT_TYPES[number], skinType, country, budget, limit: cappedLimit },
    { sort: sortBy === 'price' ? 'price-asc' : 'rating-desc' }
  );
  const products = result.products;

  return {
    type,
    skinType,
    country,
    budget,
    sortBy,
    products: products.slice(0, cappedLimit),
    total: products.slice(0, cappedLimit).length,
  };
}

/**
 * Build a complete skincare routine with product candidates per step
 */
export async function buildRoutine(params: {
  skinType: string;
  budget?: number;
  budgetMode?: string;
  country?: string;
  sortBy?: string;
  gender?: string;
  timeOfDay?: string;
  limit?: number;
}): Promise<BuildRoutineResult> {
  const {
    skinType,
    budget,
    budgetMode = 'per-product',
    sortBy = 'rating',
    gender,
    timeOfDay,
    limit = 3,
  } = params;
  const country = normaliseCountry(params.country);
  const type = skinType.toUpperCase() as SkinType;
  const candidatesPerStep = Math.min(Math.max(limit, 1), 5);

  // Fetch routine steps
  const routineResult = await getRoutine(skinType, gender, timeOfDay);

  // For each step fetch candidate products
  const stepsWithProducts: RoutineStepWithProducts[] = await Promise.all(
    routineResult.steps.map(async (step) => {
      const perProductBudget = budgetMode === 'per-product' ? budget : undefined;
      const searchResult = await searchProducts(
        {
          type: step.productType as typeof PRODUCT_TYPES[number],
          skinType: type,
          country,
          budget: perProductBudget,
          limit: candidatesPerStep,
        },
        { sort: sortBy === 'price' ? 'price-asc' : 'rating-desc' }
      );

      const candidates = searchResult.products.slice(0, candidatesPerStep);
      const lowestPrice = candidates.length > 0 ? Math.min(...candidates.map(p => p.price)) : undefined;

      return { ...step, candidates, lowestPrice };
    })
  );

  // Compute estimated min cost
  const stepPrices = stepsWithProducts
    .map(s => s.lowestPrice)
    .filter((p): p is number => p !== undefined);

  let estimatedMinCost: number | undefined;
  if (stepPrices.length > 0) {
    const rawTotal = stepPrices.reduce((a, b) => a + b, 0);

    if (budgetMode === 'total' && budget !== undefined) {
      // Greedy: sort by cheapest step first, allocate until budget exhausted
      const sorted = [...stepsWithProducts].sort((a, b) => (a.lowestPrice ?? Infinity) - (b.lowestPrice ?? Infinity));
      let remaining = budget;
      for (const step of sorted) {
        if (step.lowestPrice !== undefined && step.lowestPrice <= remaining) {
          remaining -= step.lowestPrice;
        } else {
          step.candidates = step.candidates.filter(c => c.price <= remaining);
          if (step.candidates.length === 0) step.lowestPrice = undefined;
        }
      }
      estimatedMinCost = parseFloat((budget - remaining).toFixed(2));
    } else {
      estimatedMinCost = parseFloat(rawTotal.toFixed(2));
    }
  }

  return {
    skinType: type,
    country,
    budgetMode: budgetMode as 'per-product' | 'total',
    budgetCap: budget,
    steps: stepsWithProducts,
    totalSteps: stepsWithProducts.length,
    estimatedMinCost,
  };
}

/**
 * Get information about a specific Baumann skin type
 */
export function getSkinTypeInfo(skinType: string): SkinTypeInfo {
  const t = SKIN_TYPES[skinType.toUpperCase() as SkinType];
  if (!t) {
    throw new Error(`Unknown skin type "${skinType}". Valid codes: ${SKIN_TYPE_CODES.join(', ')}`);
  }

  return wrapWithAttribution({
    ...t,
    title: `${t.code} - ${t.name}`,
    fullName: t.name,
    shortDescription: t.description,
    longDescription: t.description,
    characteristics: [
      `Category: ${t.category}`,
      `Difficulty: ${t.difficulty}/5`,
      `Baumann code: ${t.code}`,
    ],
    routineDescription: `Recommended routine focus for ${t.code}: ${t.description}`,
  });
}

/**
 * List all 16 Baumann skin types
 */
export function listSkinTypes(): ListSkinTypesResult {
  const skinTypes = SKIN_TYPE_CODES.map(code => getSkinTypeInfo(code));
  return wrapWithAttribution({ skinTypes, total: skinTypes.length });
}

/**
 * List all available product categories
 */
export function getProductTypes(): GetProductTypesResult {
  const productTypes = PRODUCT_TYPES.map(id => ({ id }));
  return wrapWithAttribution({ productTypes, total: productTypes.length });
}

/**
 * Get skincare routine steps for a specific Baumann skin type
 */
export async function getRoutine(
  skinType: string,
  gender?: string,
  timeOfDay?: string
): Promise<GetRoutineResult> {
  const type = skinType.toUpperCase() as SkinType;
  if (!SKIN_TYPE_CODES.includes(type)) {
    throw new Error(`Unknown skin type "${skinType}". Valid codes: ${SKIN_TYPE_CODES.join(', ')}`);
  }

  const url = new URL(`${LIVE_API_URL}/routines`);
  url.searchParams.set('skinType', type);
  if (gender) url.searchParams.set('gender', gender);
  if (timeOfDay) url.searchParams.set('timeOfDay', timeOfDay);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Live API error ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    title?: string;
    url?: string;
    routineDescription?: string;
    steps?: Array<{ step: number; product?: string; productType?: string; action: string; timeOfDay: 'AM' | 'PM'; gender?: string | null }>;
  };
  const steps: RoutineStep[] = (data.steps ?? []).map(st => ({
    step: st.step,
    productType: st.productType ?? st.product ?? '',
    action: st.action,
    timeOfDay: st.timeOfDay,
    ...(st.gender ? { gender: st.gender } : {}),
  }));

  return wrapWithAttribution({
    skinType: type,
    title: data.title,
    url: data.url,
    routineDescription: data.routineDescription,
    steps,
    total: steps.length,
  });
}

let _brandsCache: { brands: string[]; ts: number } | null = null;
const BRANDS_TTL_MS = 10 * 60 * 1000;

/**
 * Get all available brands (cached for 10 minutes).
 *
 * Uses /api/searchFilters, which lists every brand in the catalog in one call.
 * (/api/products pages at 100 rows, so deriving brands from it would need ~280
 * requests; /api/brands is currently failing on production.) The brand list is
 * returned as the API provides it; an optional case-insensitive `query`
 * narrows it.
 */
export async function getBrands(query?: string): Promise<GetBrandsResult> {
  if (!_brandsCache || Date.now() - _brandsCache.ts >= BRANDS_TTL_MS) {
    const url = new URL(`${LIVE_API_URL}/searchFilters`);
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Live API error ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as { brands?: unknown[] };
    const brands = [...new Set(
      (data.brands ?? [])
        .filter((b): b is string => typeof b === 'string')
        .map(b => b.trim())
        .filter(b => b.length > 0)
    )].sort((a, b) => a.localeCompare(b));

    _brandsCache = { brands, ts: Date.now() };
  }

  let brands = _brandsCache.brands;
  if (query) {
    const ql = query.toLowerCase();
    brands = brands.filter(b => b.toLowerCase().includes(ql));
  }
  return wrapWithAttribution({
    brands,
    total: brands.length,
  });
}

/**
 * Static skin type image data indexed by skintype+race
 */
const SKIN_TYPE_IMAGES: SkinTypeImageEntry[] = [
  { skinType: 'DRNT', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRNTAsian.png?alt=media&token=cdfb3a59-bc17-4f52-b3d5-8d0ef670e431' },
  { skinType: 'DRNT', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRNTBlack.png?alt=media&token=2c37a350-6094-47a4-9aa5-8a78927c67e4' },
  { skinType: 'DRNT', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRNTLatin.png?alt=media&token=13ef158e-a74a-4a40-aff5-b9ac8c987e13' },
  { skinType: 'DRNT', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRNTWhite.png?alt=media&token=11e6b422-a6f7-47f0-83a8-f76e241c413d' },
  { skinType: 'DRNW', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRNWAsian.png?alt=media&token=c708db09-ac45-421e-81f2-3de2a8067dd2' },
  { skinType: 'DRNW', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRNWBlack.png?alt=media&token=2522ea5a-dc9a-4bb0-969f-5a123e045cfd' },
  { skinType: 'DRNW', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRNWLatin.png?alt=media&token=63683fbb-7784-4dbc-a3f1-b3aed42efa07' },
  { skinType: 'DRNW', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRNWWhite.png?alt=media&token=b7409da0-753c-4605-a78d-d2cd3ead69c9' },
  { skinType: 'DRPT', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRPTAsian.png?alt=media&token=7ea2cae6-b269-4b8e-8b68-96f31bf0fc5e' },
  { skinType: 'DRPT', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRPTBlack.png?alt=media&token=ba8a2bdf-c1e0-4863-aef7-701f23ec8b54' },
  { skinType: 'DRPT', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRPTLatin.png?alt=media&token=b7a56798-b993-43f9-a630-63360738299f' },
  { skinType: 'DRPT', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRPTWhite.png?alt=media&token=34a0d003-eae3-422f-811d-44c16e87cdc8' },
  { skinType: 'DRPW', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRPWAsian.png?alt=media&token=f79edf80-eba7-4518-8aa6-d86e2f9dc03c' },
  { skinType: 'DRPW', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRPWBlack.png?alt=media&token=687f9470-a3b5-4e5d-ba26-a5e800cc0db0' },
  { skinType: 'DRPW', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRPWLatin.png?alt=media&token=6886fe32-fa0d-4b07-a67f-92b8ccf5e47a' },
  { skinType: 'DRPW', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDRPWWhite.png?alt=media&token=469cf0c0-3480-4ea0-827a-720a50de0ef4' },
  { skinType: 'DSNT', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSNTAsian.png?alt=media&token=ee11e6eb-b2ba-437a-8074-ff454842dd1d' },
  { skinType: 'DSNT', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSNTBlack.png?alt=media&token=e90a57a6-a26e-4773-ab1f-f07d57cd6a90' },
  { skinType: 'DSNT', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSNTLatin.png?alt=media&token=4adc8e07-b9cd-495e-9b3a-dc4e04e515cb' },
  { skinType: 'DSNT', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSNTWhite.png?alt=media&token=905f78a1-c7da-47ec-8c06-b2d76893515e' },
  { skinType: 'DSNW', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSNWAsian.png?alt=media&token=debd00db-2ab5-4dce-ba66-797727ba597e' },
  { skinType: 'DSNW', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSNWBlack.png?alt=media&token=f683a828-7ee6-43a0-ad3f-af57223dd279' },
  { skinType: 'DSNW', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSNWLatin.png?alt=media&token=dc8f99cd-f172-46ac-917e-d3b4f5553c80' },
  { skinType: 'DSNW', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSNWWhite.png?alt=media&token=3f98c8b1-f07d-4b9e-9ff3-a0ad5f74715e' },
  { skinType: 'DSPT', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSPTAsian.png?alt=media&token=81a94199-2d50-4672-bd54-e074d458f78d' },
  { skinType: 'DSPT', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSPTBlack.png?alt=media&token=4a3a6aac-c7a0-4dfd-aabf-c0cb3282f8f7' },
  { skinType: 'DSPT', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSPTLatin.png?alt=media&token=d8d50bd9-1163-4974-a097-c0ceb12a3763' },
  { skinType: 'DSPT', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSPTWhite.png?alt=media&token=015c937d-5d00-44f0-b638-b9e6aec5092e' },
  { skinType: 'DSPW', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSPWAsian.png?alt=media&token=435ee03a-dc23-4741-9401-6d0590d5c0bf' },
  { skinType: 'DSPW', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSPWBlack.png?alt=media&token=19cef9a7-711a-4780-a4ef-cbcd03fcb0c0' },
  { skinType: 'DSPW', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSPWLatin.png?alt=media&token=25231500-1bf0-4e0c-9241-692a93c4b430' },
  { skinType: 'DSPW', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FDSPWWhite.png?alt=media&token=f8bc459e-6fab-481d-9d58-69a948bf95b7' },
  { skinType: 'ORNT', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORNTAsian.png?alt=media&token=c8191ad2-d3ae-4e22-a9c0-0a39aed565bc' },
  { skinType: 'ORNT', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORNTBlack.png?alt=media&token=5a8a70cd-8ec1-46db-ad2b-fb2f0dcbc9aa' },
  { skinType: 'ORNT', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORNTLatin.png?alt=media&token=1710e262-2c3d-49a7-8d26-76cc8cf20295' },
  { skinType: 'ORNT', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORNTWhite.png?alt=media&token=52828ee1-140a-4e7d-a25e-20db4cc27b9b' },
  { skinType: 'ORNW', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORNWAsian.png?alt=media&token=62ffae58-271a-414c-aa7c-c9009f4e3946' },
  { skinType: 'ORNW', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORNWBlack.png?alt=media&token=8c354b90-1fb8-4c42-9f3a-b43deec67ce8' },
  { skinType: 'ORNW', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORNWLatin.png?alt=media&token=8e248517-7abc-4b73-8cf4-77c5639a81f3' },
  { skinType: 'ORNW', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORNWWhite.png?alt=media&token=714c250d-d67b-4373-a6e3-01e2da7c0060' },
  { skinType: 'ORPT', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORPTAsian.png?alt=media&token=69ed09f6-10f2-43db-b089-343945a4777b' },
  { skinType: 'ORPT', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORPTBlack.png?alt=media&token=251797f1-f368-4bf6-9d92-85f451b06fde' },
  { skinType: 'ORPT', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORPTLatin.png?alt=media&token=7d7ae50d-36da-4a0e-afca-8348c6c9a7f4' },
  { skinType: 'ORPT', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORPTWhite.png?alt=media&token=ce32d5d8-c012-4b44-8508-e86562a00991' },
  { skinType: 'ORPW', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORPWAsian.png?alt=media&token=1c3ed119-c580-4c8f-90c5-31ccfb5aba62' },
  { skinType: 'ORPW', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORPWLatin.png?alt=media&token=aef01802-44da-4f6c-b14a-b988efc35b8a' },
  { skinType: 'ORPW', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FORPWWhite.png?alt=media&token=bdce29b0-3a7e-43c5-84f7-70d3801e15d5' },
  { skinType: 'OSNT', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSNTAsian.png?alt=media&token=fae95482-e126-478d-862d-e92ae50e2779' },
  { skinType: 'OSNT', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSNTBlack.png?alt=media&token=6631348c-1061-404c-8048-2af6d4d2e51a' },
  { skinType: 'OSNT', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSNTLatin.png?alt=media&token=7cdfd3ac-2c72-49d7-af50-6b793ca479d3' },
  { skinType: 'OSNT', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSNTWhite.png?alt=media&token=c0a5dda7-1049-42db-9c44-05a8c60d4585' },
  { skinType: 'OSNW', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSNWAsian.png?alt=media&token=87cc88f6-84df-48af-b697-b35598984280' },
  { skinType: 'OSNW', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSNWBlack.png?alt=media&token=c081d8b0-1912-44cf-a577-292c29c66054' },
  { skinType: 'OSNW', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSNWLatin.png?alt=media&token=1fac7ecf-841a-4d6f-befa-978086e0f4f2' },
  { skinType: 'OSNW', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSNWWhite.png?alt=media&token=5795c4ab-a126-46af-8867-b65d817d3bf6' },
  { skinType: 'OSPT', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSPTAsian.png?alt=media&token=b5837bb3-3c69-4ba5-933b-e8fe7f3d020c' },
  { skinType: 'OSPT', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSPTBlack.png?alt=media&token=06816b19-442a-4d97-a06d-ebcc32778e61' },
  { skinType: 'OSPT', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSPTLatino.png?alt=media&token=d7d25fb7-62ad-4036-8f2b-59443a8f9ff0' },
  { skinType: 'OSPT', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSPTWhite.png?alt=media&token=c523c70f-6d57-43ea-bd95-16c849e64860' },
  { skinType: 'OSPW', race: 'Asian',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSPWAsian.png?alt=media&token=7919ffe5-9468-4930-820e-9dcf8aabffdc' },
  { skinType: 'OSPW', race: 'Black',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSPWBlack.png?alt=media&token=392fa663-4bfa-4262-afbd-3612ea0f68cf' },
  { skinType: 'OSPW', race: 'Latin',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSPWLatin.png?alt=media&token=3f0c2630-e2d8-4962-b748-71900ff01036' },
  { skinType: 'OSPW', race: 'White',  url: 'https://firebasestorage.googleapis.com/v0/b/vanity-e971f.firebasestorage.app/o/skintypes%2FOSPWWhite.png?alt=media&token=8a33f651-646b-458a-b339-57e70215d3ae' },
];

/**
 * Get skin type illustration image(s) by skin type and optional race
 */
export function getSkinTypeImage(
  skinType: string,
  race?: string
): GetSkinTypeImageResult {
  const type = skinType.toUpperCase() as SkinType;
  if (!SKIN_TYPE_CODES.includes(type)) {
    throw new Error(`Unknown skin type "${skinType}". Valid codes: ${SKIN_TYPE_CODES.join(', ')}`);
  }

  let images = SKIN_TYPE_IMAGES.filter(e => e.skinType === type);

  if (race) {
    const normalised = race.charAt(0).toUpperCase() + race.slice(1).toLowerCase() as SkinTypeImageRace;
    images = images.filter(e => e.race === normalised);
    if (images.length === 0) {
      throw new Error(`No image found for skin type "${type}" and race "${race}". Valid races: Asian, Black, Latin, White.`);
    }
  }

  return { skinType: type, images, total: images.length };
}

/**
 * Get user reviews for a specific product.
 *
 * Served by the productReviews Cloud Function (query param `product_id`).
 * Its `sort=rating` currently returns 500, so on a server error for that sort
 * the reviews are fetched newest-first and sorted by rating locally.
 */
export async function getProductReviews(
  product_id: string,
  sort?: string,
  limit?: number
): Promise<GetProductReviewsResult> {
  const fetchReviews = async (sortParam?: string) => {
    const url = new URL(`${FUNCTIONS_URL}/productReviews`);
    url.searchParams.set('product_id', product_id);
    if (sortParam) url.searchParams.set('sort', sortParam);
    if (limit != null) url.searchParams.set('limit', String(limit));
    return fetch(url.toString());
  };

  let res = await fetchReviews(sort);
  let sortedLocally = false;
  if (!res.ok && res.status >= 500 && sort === 'rating') {
    res = await fetchReviews('recent');
    sortedLocally = true;
  }
  if (!res.ok) {
    throw new Error(`Live API error ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    reviews?: GetProductReviewsResult['reviews'];
    product_name?: string | null;
    avg_rating?: number | null;
    review_count?: number | null;
  };
  let reviews = data.reviews ?? [];
  if (sortedLocally) {
    reviews = [...reviews].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return {
    product_id,
    product_name: data.product_name ?? null,
    avg_rating: data.avg_rating ?? null,
    review_count: data.review_count ?? null,
    reviews,
    total: reviews.length,
    ...(sortedLocally && { _note: "sort=rating failed upstream; reviews were fetched newest-first and sorted by rating locally." }),
  };
}

/**
 * Get enriched ingredient list for a specific product
 */
export async function getProductIngredients(product_id: string): Promise<GetProductIngredientsResult> {
  const url = new URL(`${FUNCTIONS_URL}/productIngredients`);
  url.searchParams.set('product_id', product_id);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Live API error ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { ingredients?: Array<{ name: string; detail?: IngredientDetail }> };
  const ingredients = data.ingredients ?? [];

  return wrapWithAttribution({
    product_id,
    ingredients,
    total: ingredients.length,
  });
}

/**
 * Look up detailed information about a skincare ingredient
 */
export async function getIngredientInfo(slug?: string, name?: string): Promise<GetIngredientInfoResult> {
  if (!slug && !name) {
    throw new Error('Provide at least one of: slug or name');
  }

  const url = new URL(`${FUNCTIONS_URL}/ingredientInfo`);
  if (slug) url.searchParams.set('slug', slug);
  if (name) url.searchParams.set('name', name);

  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 404) {
      return wrapWithAttribution({ ingredient: null, found: false });
    }
    throw new Error(`Live API error ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { ingredient?: IngredientDetail };
  const ingredient = data.ingredient ?? null;

  return wrapWithAttribution({
    ingredient,
    found: ingredient !== null,
  });
}
