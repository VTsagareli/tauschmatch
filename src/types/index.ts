// Placeholder for shared types
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
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}
export interface Apartment {}
export interface Match {} 
export interface Listing {
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
  // Optional fields
  features?: string[];
  heating?: string;
  flooring?: string;
  wbsRequired?: boolean;
  description?: string;
  images?: string[];
  contactName?: string;
  dateListed?: string;
  searchCriteria?: {
    districts?: string[];
    maxColdRent?: number;
    minRooms?: number;
    minSquareMeters?: number;
    [key: string]: any;
  };
  address?: string;
  furnished?: boolean;
  energyCertificate?: string;
  otherAmenities?: string[];
}
// Update the 'LookingFor' type to match Tauschwohnung search criteria style
export interface LookingFor {
  districts: string[];
  maxColdRent?: number;
  minRooms?: number;
  minSquareMeters?: number;
  // Optionally, other search criteria fields
  [key: string]: any;
} 