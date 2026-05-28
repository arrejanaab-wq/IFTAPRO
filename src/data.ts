import { FuelRecord } from "./types";

// ─── IFTA Tax Rates Q2 2026 ($/gallon diesel) ───────────────────────────────
export const IFTA_RATES: Record<string, number> = {
  AL: 0.290, AZ: 0.260, AR: 0.285, CA: 0.800, CO: 0.205, CT: 0.402, DE: 0.220, FL: 0.349,
  GA: 0.326, ID: 0.320, IL: 0.736, IN: 0.530, IA: 0.326, KS: 0.260, KY: 0.246, LA: 0.200,
  ME: 0.312, MD: 0.365, MA: 0.240, MI: 0.310, MN: 0.285, MS: 0.180, MO: 0.170, MT: 0.292,
  NE: 0.246, NV: 0.270, NH: 0.222, NJ: 0.418, NM: 0.210, NY: 0.471, NC: 0.403, ND: 0.230,
  OH: 0.475, OK: 0.190, OR: 0.362, PA: 0.741, RI: 0.340, SC: 0.220, SD: 0.280, TN: 0.270,
  TX: 0.200, UT: 0.313, VT: 0.326, VA: 0.273, WA: 0.494, WV: 0.357, WI: 0.329, WY: 0.240,
};

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska",
  NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const QUARTERS = ["Q2 2026", "Q1 2026", "Q4 2025", "Q3 2025", "Q2 2025", "Q1 2025"];

export const SAMPLE_FUEL_CARD = [
  { date: "2026-04-02", unit: "Truck-101", state: "TX", gallons: 85, price_per_gal: 3.45, vendor: "Pilot Flying J" },
  { date: "2026-04-05", unit: "Truck-101", state: "LA", gallons: 70, price_per_gal: 3.38, vendor: "TA Travel Center" },
  { date: "2026-04-10", unit: "Truck-102", state: "IL", gallons: 92, price_per_gal: 3.62, vendor: "Flying J" },
  { date: "2026-04-15", unit: "Truck-102", state: "IN", gallons: 80, price_per_gal: 3.50, vendor: "Pilot" },
  { date: "2026-04-20", unit: "Truck-103", state: "OH", gallons: 78, price_per_gal: 3.55, vendor: "TA" },
  { date: "2026-04-25", unit: "Truck-103", state: "PA", gallons: 95, price_per_gal: 3.70, vendor: "Love's" },
];
