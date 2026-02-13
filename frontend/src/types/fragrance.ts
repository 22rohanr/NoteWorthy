export interface Note {
  id: string;
  name: string;
  family?: 'Citrus' | 'Floral' | 'Woody' | 'Oriental' | 'Fresh' | 'Gourmand' | 'Spicy';
}

export interface Brand {
  id: string;
  name: string;
  country: string;
  foundedYear?: number;
}

export interface Fragrance {
  id: string;
  name: string;
  brand: Brand;
  releaseYear: number;
  concentration: 'EDP' | 'EDT' | 'Parfum' | 'EDC' | 'Cologne';
  gender: 'Unisex' | 'Masculine' | 'Feminine';
  description: string;
  perfumer?: string;
  imageUrl: string;
  notes: {
    top: Note[];
    middle: Note[];
    base: Note[];
  };
  ratings: {
    overall: number;
    longevity: number;
    sillage: number;
    value: number;
    reviewCount: number;
  };
  price?: {
    amount: number;
    currency: string;
    size: string;
  };
}

export interface Review {
  id: string;
  fragranceId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: {
    overall: number;
    longevity: number;
    sillage: number;
    value: number;
  };
  content: string;
  wearContext?: {
    sprays: number;
    weather: string;
    occasion: string;
  };
  impressions?: {
    opening: string;
    midDrydown: string;
    dryDown: string;
  };
  upvotes: number;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  preferences?: {
    likedNotes: string[];
    avoidedNotes: string[];
    preferredConcentrations: string[];
  };
  collection: {
    owned: string[];
    sampled: string[];
    wishlist: string[];
  };
  createdAt: string;
}

export type CollectionTab = 'owned' | 'sampled' | 'wishlist';
