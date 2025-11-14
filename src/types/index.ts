// Shared types for user, listings, and matching

export interface User {
  uid: string;
  email: string;
  displayName?: string;

  myApartment?: {
    type: string;
    rooms: string;
    squareMeters: string;
    coldRent: string;
    floor: string;
    balcony: boolean;
    petsAllowed: boolean;
    street?: string;
    number?: string;
    zipcode?: string;
    city?: string;
  };

  lookingFor?: {
    type: string;
    minRooms: string;
    minSquareMeters: string;
    maxColdRent: string;
    floor: string;
    balcony: boolean;
    petsAllowed: boolean;
    districts?: string[];
    street?: string;
    number?: string;
  };

  // Descriptions for AI scoring
  description?: string;
  offeredDescription?: string;
  lookingForDescription?: string;

  createdAt?: any;
  updatedAt?: any;
}

export interface Listing {
  id: string; // Required — Firestore doc ID or unique identifier
  link: string;
  district: string;
  type: string;
  coldRent: number;
  extraCosts: number;
  deposit: number;
  floor: number;
  petsAllowed: boolean;
  balconyOrTerrace: boolean;
  rooms: number;
  squareMeters: number;

  // Optional listing metadata
  features?: string[];
  heating?: string;
  flooring?: string;
  wbsRequired?: boolean;
  description?: string; // offered
  offeredDescription?: string;
  lookingForDescription?: string;
  images?: string[];
  contactName?: string;
  dateListed?: string;
  address?: string;
  furnished?: boolean;
  energyCertificate?: string;
  otherAmenities?: string[];

  // Optional structured criteria for search
  searchCriteria?: {
    districts?: string[];
    maxColdRent?: number;
    minRooms?: number;
    minSquareMeters?: number;
    [key: string]: any;
  };
}

export interface LookingFor {
  districts: string[];
  maxColdRent?: number;
  minRooms?: number;
  minSquareMeters?: number;
  [key: string]: any;
}

export interface MatchReasonBreakdown {
  structured: string[];
  descriptions: string[];
}

export interface MatchResult {
  listing: Listing;
  score: number; // Combined score (60% structured + 40% semantic)
  structuredScore?: number; // Structured match score (0-10)
  semanticScore?: number; // Semantic/AI match score (0-10)
  traditionalScore?: number; // Deprecated, use structuredScore
  filters?: Record<string, unknown>;
  reasonBreakdown?: {
    theirApartment: MatchReasonBreakdown;
    yourApartment: MatchReasonBreakdown;
  };
  whyThisMatches?: string[];
  whatYouWantAndTheyHave?: string[]; // Semantic reasons
  whatYouHaveAndTheyWant?: string[]; // Semantic reasons
}
