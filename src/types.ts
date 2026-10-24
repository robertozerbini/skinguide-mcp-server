import { z } from 'zod';

/**
 * Baumann Skin Type System
 * Classifies skin along four binary axes
 */
export const SkinTypeEnum = z.enum([
  'DSPW', 'DSNW', 'DSPT', 'DSNT',
  'DRPW', 'DRNW', 'DRPT', 'DRNT',
  'OSPW', 'OSNT', 'OSNW', 'OSPT',
  'ORPW', 'ORNW', 'ORPT', 'ORNT',
]);

export type SkinType = z.infer<typeof SkinTypeEnum>;

export interface SkincareProduct {
  id: number;
  name: string;
  brand: string;
  type: string;
  price: number;
  currency: string;
  size?: string | null;
  vegan?: boolean;
  ingredients?: string[];
  image?: string;
  link?: string;
  country: string;
  skinTypes: SkinType[];
}

export type CountryCode = 'US' | 'AE';

export interface SearchProductsParams {
  type?: string;
  brand?: string;
  skinType?: string;
  od?: 'O' | 'D';
  sr?: 'S' | 'R';
  pn?: 'P' | 'N';
  wt?: 'W' | 'T';
  budget?: number;
  keyword?: string;
  ingredient?: string;
  country?: CountryCode;
  limit?: number;
}

export interface SearchProductsResult {
  /** Server-side count of all matching products (not just the returned page). */
  total: number;
  /** Number of products in this response. */
  returned: number;
  /** Filters the API did not apply and that were applied to the returned page only. */
  filtersAppliedLocally?: string[];
  query: {
    type: string;
    brand: string | null;
    skinType: string | null;
    od: string | null;
    sr: string | null;
    pn: string | null;
    wt: string | null;
    budget: number | null;
    keyword: string | null;
    ingredient: string | null;
  };
  products: SkincareProduct[];
  available_without_ingredient_filter?: number;
}

export interface SkinTypeInfo {
  code: SkinType;
  title: string;
  fullName: string;
  shortDescription: string;
  longDescription: string;
  characteristics: string[];
  routineDescription: string;
  name: string;
  category: string;
  difficulty: number;
  description: string;
}

export interface ListSkinTypesResult {
  skinTypes: SkinTypeInfo[];
  total: number;
}

export interface GetProductTypesResult {
  productTypes: Array<{ id: string }>;
  total: number;
}

export interface RoutineStep {
  step: number;
  productType: string;
  action: string;
  timeOfDay: 'AM' | 'PM';
  gender?: string;
}

export interface GetRoutineResult {
  skinType: SkinType;
  title?: string;
  url?: string;
  routineDescription?: string;
  steps: RoutineStep[];
  total: number;
}

export interface GetBrandsResult {
  brands: string[];
  total: number;
}

export interface TestQuestionOption {
  text: string;
  /** Score contributed to the question's section when this option is chosen. */
  score: number;
}

/** Shape returned by GET /api/testQuestions. */
export interface TestQuestion {
  id: string;
  section: 'O_D' | 'S_R' | 'P_N' | 'W_T';
  text: string;
  options: TestQuestionOption[];
  order?: number;
}

export interface GetTestQuestionsResult {
  questions: TestQuestion[];
  total: number;
  sections?: string[];
  sectionLabels?: Record<string, string>;
}

export interface SubmitTestAnswerInput {
  questionId: string;
  value: number;
}

export interface SubmitTestAnswersResult {
  skinType: SkinType;
  scores: Record<'O_D' | 'S_R' | 'P_N' | 'W_T', number>;
  acne?: boolean;
  darkSpots?: boolean;
}

export interface CompareProductsResult {
  type: string;
  skinType?: string;
  country?: CountryCode;
  budget?: number;
  sortBy: string;
  products: SkincareProduct[];
  total: number;
}

export interface RoutineStepWithProducts {
  step: number;
  productType: string;
  action: string;
  timeOfDay: 'AM' | 'PM';
  gender?: string;
  candidates: SkincareProduct[];
  lowestPrice?: number;
}

export interface BuildRoutineResult {
  skinType: SkinType;
  country?: CountryCode;
  budgetMode: 'per-product' | 'total';
  budgetCap?: number;
  steps: RoutineStepWithProducts[];
  totalSteps: number;
  estimatedMinCost?: number;
}

/** Shape returned by the productReviews Cloud Function. */
export interface ProductReview {
  reviewId?: string;
  rating: number;
  comment?: string;
  userSkinType?: string;
  userAgeRange?: string;
  createdAt?: string;
}

export interface GetProductReviewsResult {
  product_id: string;
  product_name?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  _note?: string;
  reviews: ProductReview[];
  total: number;
}

/** Shape returned by the ingredientInfo Cloud Function (values are strings on the wire). */
export interface IngredientDetail {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  quick_facts?: string;
  our_take?: string;
  comedogenicity?: string | number | null;
  irritancy?: string | number | null;
  what_it_does?: string;
  all_functions?: string;
  also_called?: string;
  aliases?: string[] | string;
  source_url?: string;
}

export interface ProductIngredient {
  name: string;
  detail?: IngredientDetail;
}

export interface GetProductIngredientsResult {
  product_id: string;
  ingredients: ProductIngredient[];
  total: number;
}

export interface GetIngredientInfoResult {
  ingredient: IngredientDetail | null;
  found: boolean;
}

export type SkinTypeImageRace = 'Asian' | 'Black' | 'Latin' | 'White';

export interface SkinTypeImageEntry {
  skinType: SkinType;
  race: SkinTypeImageRace;
  url: string;
}

export interface GetSkinTypeImageResult {
  skinType: SkinType;
  images: SkinTypeImageEntry[];
  total: number;
}
