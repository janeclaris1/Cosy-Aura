import { liteClient as algoliasearch } from "algoliasearch/lite";

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "";
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || "";

export const searchClient =
  appId && searchKey ? algoliasearch(appId, searchKey) : null;

export const FRAGRANCES_INDEX = "fragrances";

export interface AlgoliaFragrance {
  objectID: string;
  slug: string;
  brand: string;
  brandSlug: string;
  model: string;
  reference: string;
  description: string;
  price: number;
  condition: string;
  fragranceFamily: string;
  bottleMaterial: string;
  capType: string;
  concentration: string;
  bottleSize: number;
  year: number | null;
  gender: string;
  image: string;
  featured: boolean;
  category: string | null;
  createdAt: number;
}
