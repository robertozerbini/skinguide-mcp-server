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
  limit?: number;
}

export interface SearchProductsResult {
  total: number;
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
  steps: RoutineStep[];
  total: number;
}

export interface GetBrandsResult {
  brands: string[];
  total: number;
}

export interface TestQuestionOption {
  text: string;
  value: number;
}

export interface TestQuestion {
  id: string;
  dimension: 'O_D' | 'S_R' | 'P_N' | 'W_T';
  question: string;
  options: TestQuestionOption[];
}

export interface GetTestQuestionsResult {
  questions: TestQuestion[];
  total: number;
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
