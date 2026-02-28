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
  image?: string;
  link?: string;
  country: string;
  skinTypes: SkinType[];
}

export interface SearchProductsParams {
  type?: string;
  country?: 'US' | 'UAE';
  od?: 'O' | 'D';
  sr?: 'S' | 'R';
  pn?: 'P' | 'N';
  wt?: 'W' | 'T';
  budget?: number;
  limit?: number;
}

export interface SearchProductsResult {
  total: number;
  query: {
    type: string;
    country: string;
    od: string | null;
    sr: string | null;
    pn: string | null;
    wt: string | null;
    budget: number | null;
  };
  products: SkincareProduct[];
}

export interface SkinTypeInfo {
  code: SkinType;
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
