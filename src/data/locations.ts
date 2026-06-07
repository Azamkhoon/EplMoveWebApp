import type { Location } from "@/types";

export const LOCATIONS: Record<string, Location> = {
  rotterdam: { city: "Rotterdam", country: "Netherlands", code: "NLRTM", lat: 51.9244, lng: 4.4777 },
  hamburg: { city: "Hamburg", country: "Germany", code: "DEHAM", lat: 53.5511, lng: 9.9937 },
  antwerp: { city: "Antwerp", country: "Belgium", code: "BEANR", lat: 51.2194, lng: 4.4025 },
  felixstowe: { city: "Felixstowe", country: "United Kingdom", code: "GBFXT", lat: 51.9542, lng: 1.3464 },
  lehavre: { city: "Le Havre", country: "France", code: "FRLEH", lat: 49.4944, lng: 0.1079 },
  barcelona: { city: "Barcelona", country: "Spain", code: "ESBCN", lat: 41.3851, lng: 2.1734 },
  genoa: { city: "Genoa", country: "Italy", code: "ITGOA", lat: 44.4056, lng: 8.9463 },
  gdansk: { city: "Gdansk", country: "Poland", code: "PLGDN", lat: 54.352, lng: 18.6466 },
  newyork: { city: "New York", country: "United States", code: "USNYC", lat: 40.7128, lng: -74.006 },
  losangeles: { city: "Los Angeles", country: "United States", code: "USLAX", lat: 33.7406, lng: -118.2706 },
  shanghai: { city: "Shanghai", country: "China", code: "CNSHA", lat: 31.2304, lng: 121.4737 },
  singapore: { city: "Singapore", country: "Singapore", code: "SGSIN", lat: 1.3521, lng: 103.8198 },
  dubai: { city: "Dubai", country: "UAE", code: "AEJEA", lat: 25.2048, lng: 55.2708 },
  mumbai: { city: "Mumbai", country: "India", code: "INNSA", lat: 18.9499, lng: 72.9486 },
};
