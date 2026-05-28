import { TripRecord, FuelRecord, CalculationResults } from "./types";
import { IFTA_RATES, STATE_NAMES } from "./data";

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  // Parse headers: lowercase, lowercase clean snake case
  const headers = lines[0].split(",").map(h => 
    h.trim()
     .toLowerCase()
     .replace(/[\s\-]+/g, "_")
     .replace(/[^a-z0-9_]/g, "")
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV cell extraction respecting simple column structures
    const vals: string[] = [];
    let currentCell = "";
    let insideQuotes = false;
    const currentLine = lines[i];

    for (let charIndex = 0; charIndex < currentLine.length; charIndex++) {
      const char = currentLine[charIndex];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        vals.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    vals.push(currentCell.trim());

    if (vals.every(v => !v)) continue;
    
    // Create direct maps
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] !== undefined ? vals[idx].replace(/^["']|["']$/g, "").trim() : "";
    });
    rows.push(obj);
  }
  return rows;
}

// ─── CALCULATION ENGINE ───────────────────────────────────────────────────────
export function calculateIFTA(trips: TripRecord[], fuel: FuelRecord[]): CalculationResults {
  const units: CalculationResults = {};

  const ensure = (u: string) => { 
    if (!units[u]) {
      units[u] = { 
        milesMap: {}, 
        gallonsMap: {}, 
        totalMiles: 0, 
        totalGallons: 0, 
        rawTrips: [], 
        rawFuel: [] 
      } as any; 
    } 
  };

  trips.forEach(t => {
    const rawUnit = t.unit_number || t.unit || t.truck || "Unit-1";
    const u = String(rawUnit).trim();
    if (!u) return;

    const rawSt = t.state || t.jurisdiction || t.st || "";
    const st = String(rawSt).toUpperCase().slice(0, 2);
    
    const rawMiles = t.miles || t.taxable_miles || t.driven_miles || 0;
    const mi = parseFloat(String(rawMiles));

    ensure(u);
    units[u].rawTrips.push(t);
    if (st && !isNaN(mi) && mi > 0) {
      units[u].milesMap[st] = (units[u].milesMap[st] || 0) + mi;
      units[u].totalMiles += mi;
    }
  });

  fuel.forEach(f => {
    const rawUnit = f.unit_number || f.unit || f.truck || "Unit-1";
    const u = String(rawUnit).trim();
    if (!u) return;

    const rawSt = f.state || f.jurisdiction || f.st || "";
    const st = String(rawSt).toUpperCase().slice(0, 2);

    const rawGal = f.gallons || f.quantity || f.gallons_purchased || 0;
    const gal = parseFloat(String(rawGal));

    ensure(u);
    units[u].rawFuel.push(f);
    if (st && !isNaN(gal) && gal > 0) {
      units[u].gallonsMap[st] = (units[u].gallonsMap[st] || 0) + gal;
      units[u].totalGallons += gal;
    }
  });

  const results: CalculationResults = {};

  Object.entries(units).forEach(([u, d]) => {
    const mpg = d.totalGallons > 0 ? d.totalMiles / d.totalGallons : 6.5;
    const stateResults: any = {};
    const allSt = new Set([...Object.keys(d.milesMap), ...Object.keys(d.gallonsMap)]);
    let netTotal = 0;

    allSt.forEach(st => {
      const mi = d.milesMap[st] || 0;
      const gp = d.gallonsMap[st] || 0;
      const gc = mpg > 0 ? mi / mpg : 0;
      const rate = IFTA_RATES[st] || 0;
      const owed = gc * rate;
      const paid = gp * rate;
      const net = owed - paid;
      netTotal += net;

      stateResults[st] = {
        mi,
        gp,
        gc: +gc.toFixed(3),
        rate,
        owed: +owed.toFixed(2),
        paid: +paid.toFixed(2),
        net: +net.toFixed(2)
      };
    });

    results[u] = {
      ...d,
      mpg: +mpg.toFixed(2),
      stateResults,
      netTotal: +netTotal.toFixed(2)
    };
  });

  return results;
}

// ─── PDF REPORT GENERATOR ─────────────────────────────────────────────────────
export function generatePDFHTML(results: CalculationResults, quarter: string): string {
  const totalNet = Object.values(results).reduce((s, u) => s + u.netTotal, 0);
  const totalMiles = Object.values(results).reduce((s, u) => s + u.totalMiles, 0);

  const rows = Object.entries(results).flatMap(([unit, u]) =>
    Object.entries(u.stateResults).map(([st, s]) => {
      const stateName = STATE_NAMES[st] || "";
      const netColor = s.net > 0 ? "#ef4444" : "#10b981";
      const netPrefix = s.net > 0 ? "+" : "";
      return `
        <tr>
          <td>${unit}</td>
          <td>${st} - ${stateName}</td>
          <td>${s.mi.toLocaleString()}</td>
          <td>${s.gc.toFixed(3)}</td>
          <td>${s.gp.toFixed(2)}</td>
          <td>$${s.rate.toFixed(3)}</td>
          <td>$${s.owed.toFixed(2)}</td>
          <td>$${s.paid.toFixed(2)}</td>
          <td style="color:${netColor}; font-weight:bold">${netPrefix}$${s.net.toFixed(2)}</td>
        </tr>
      `;
    })
  ).join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>IFTA Fleet Tax Report - ${quarter}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; background: #f8fafc; }
          .container { max-width: 1000px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          h1 { color: #0f172a; border-bottom: 3px solid #f97316; padding-bottom: 12px; margin-top: 0; font-size: 26px; }
          .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 24px 0; background: #f1f5f9; padding: 20px; border-radius: 8px; }
          .meta-item label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; }
          .meta-item .value { display: block; font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; }
          th { background: #0f172a; color: #ffffff; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .total { background: #fff7ed !important; font-weight: bold; font-size: 15px; }
          .total td { border-top: 2px solid #fdba74; padding: 16px 10px; }
          .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚛 IFTA Fleet Fuel Tax Report</h1>
          <div class="meta">
            <div class="meta-item"><label>Quarter</label><span class="value">${quarter}</span></div>
            <div class="meta-item"><label>Total Miles</label><span class="value">${totalMiles.toLocaleString()}</span></div>
            <div class="meta-item"><label>Fleet Units</label><span class="value">${Object.keys(results).length}</span></div>
            <div class="meta-item">
              <label>Net ${totalNet >= 0 ? "Tax Owed" : "Credit Due"}</label>
              <span class="value" style="color:${totalNet >= 0 ? "#ef4444" : "#10b981"}">$${Math.abs(totalNet).toFixed(2)}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>State Jurisdiction</th>
                <th>Distance Miles</th>
                <th>Gal Consumed</th>
                <th>Gal Purchased</th>
                <th>Diesel Rate</th>
                <th>Tax Owed</th>
                <th>Tax Paid</th>
                <th>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total">
                <td colspan="8">FLEET COMBINED NET OUTSTANDING TAX</td>
                <td style="color:${totalNet >= 0 ? "#ef4444" : "#10b981"}">${totalNet >= 0 ? "+" : ""}$${totalNet.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Generated via IFTA Pro Fleet Management Platform on ${new Date().toLocaleDateString()}<br>
            Validate current regional fuel tax updates at the official IFTA, Inc. clearinghouse (iftach.org) prior to submittal.
          </div>
        </div>
      </body>
    </html>
  `;
}
