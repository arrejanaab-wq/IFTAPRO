export interface TripRecord {
  unit_number?: string;
  unit?: string;
  truck?: string;
  state?: string;
  jurisdiction?: string;
  st?: string;
  miles?: string | number;
  taxable_miles?: string | number;
  driven_miles?: string | number;
  date?: string;
}

export interface FuelRecord {
  unit_number?: string;
  unit?: string;
  truck?: string;
  state?: string;
  jurisdiction?: string;
  st?: string;
  gallons?: string | number;
  quantity?: string | number;
  gallons_purchased?: string | number;
  date?: string;
  price_per_gal?: number;
  vendor?: string;
}

export interface StateResult {
  mi: number;
  gp: number;
  gc: number;
  rate: number;
  owed: number;
  paid: number;
  net: number;
}

export interface UnitCalculatedData {
  milesMap: Record<string, number>;
  gallonsMap: Record<string, number>;
  totalMiles: number;
  totalGallons: number;
  rawTrips: TripRecord[];
  rawFuel: FuelRecord[];
  mpg: number;
  stateResults: Record<string, StateResult>;
  netTotal: number;
}

export type CalculationResults = Record<string, UnitCalculatedData>;

export interface AIAnomaly {
  unit: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  type: "MPG" | "TAX" | "MILEAGE" | "FUEL" | "COMPLIANCE";
  title: string;
  detail: string;
  recommendation: string;
}

export interface AIOptimization {
  title: string;
  detail: string;
  potential_savings: string;
}

export interface AIAnalysisResponse {
  overall_risk: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  anomalies: AIAnomaly[];
  optimizations: AIOptimization[];
  filing_checklist: string[];
}
