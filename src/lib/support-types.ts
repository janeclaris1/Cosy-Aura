export type SupportCartLine = {
  fragranceId: string;
  slug: string;
  brand: string;
  model: string;
  price: number;
  image: string;
  bottleSize: number;
  quantity: number;
};

/** Client-side cart line sent to Enow so she can remove items. */
export type SupportCartSnapshot = {
  fragranceId: string;
  slug: string;
  brand: string;
  model: string;
  bottleSize?: number;
  quantity: number;
  price: number;
};

export type SupportCartRemoval = {
  fragranceId: string;
  slug: string;
  brand: string;
  model: string;
  bottleSize?: number;
};
