import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
import { User, Trip, Fuel, Truck } from "./models";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/iftapro", {
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of hanging indefinitely
})
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// --- Auth Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.headers['authorization']?.split(' ')[1] || req.cookies.token;
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ error: "Invalid token." });
  }
};

const authorizeRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// --- Auth Routes ---
app.post("/api/auth/register", async (req, res) => {
  try {
    const { password, displayName, role } = req.body;
    const email = req.body.email?.trim().toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const fleetId = new mongoose.Types.ObjectId().toString(); // New fleet for new owner

    const user = new User({
      email,
      password: hashedPassword,
      displayName,
      role: role || 'owner',
      fleetId
    });

    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, fleetId: user.fleetId }, JWT_SECRET);
    res.json({ token, user: { email: user.email, displayName: user.displayName, role: user.role, fleetId: user.fleetId } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(400).json({ error: "Invalid email or password." });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid email or password." });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, fleetId: user.fleetId }, JWT_SECRET);
    res.json({ token, user: { email: user.email, displayName: user.displayName, role: user.role, fleetId: user.fleetId } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ error: "Invalid Google token" });

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = new User({
        email: payload.email,
        googleId: payload.sub,
        displayName: payload.name,
        role: 'owner',
        fleetId: new mongoose.Types.ObjectId().toString()
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, fleetId: user.fleetId }, JWT_SECRET);
    res.json({ token, user: { email: user.email, displayName: user.displayName, role: user.role, fleetId: user.fleetId } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- OCR Proxy Route ---
app.post("/api/ocr-receipt", authenticateToken, async (req: any, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) return res.status(400).json({ error: "Missing base64Image" });

    const formData = new URLSearchParams();
    formData.append("base64Image", base64Image);
    formData.append("apikey", process.env.OCR_SPACE_KEY || "");
    formData.append("isOverlayRequired", "false");
    formData.append("OCREngine", "2");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Data Routes ---
app.get("/api/trips", authenticateToken, async (req: any, res) => {
  try {
    const trips = await Trip.find({ fleetId: req.user.fleetId });
    res.json(trips);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trips", authenticateToken, authorizeRole(['owner', 'dispatcher']), async (req: any, res) => {
  try {
    const trip = new Trip({ ...req.body, fleetId: req.user.fleetId });
    await trip.save();
    res.json(trip);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/trips/:id", authenticateToken, authorizeRole(['owner', 'dispatcher']), async (req: any, res) => {
  try {
    await Trip.findOneAndDelete({ _id: req.params.id, fleetId: req.user.fleetId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/fuel", authenticateToken, async (req: any, res) => {
  try {
    const fuel = await Fuel.find({ fleetId: req.user.fleetId });
    res.json(fuel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/fuel", authenticateToken, authorizeRole(['owner', 'dispatcher']), async (req: any, res) => {
  try {
    const fuel = new Fuel({ ...req.body, fleetId: req.user.fleetId });
    await fuel.save();
    res.json(fuel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/fuel/:id", authenticateToken, authorizeRole(['owner', 'dispatcher']), async (req: any, res) => {
  try {
    await Fuel.findOneAndDelete({ _id: req.params.id, fleetId: req.user.fleetId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize the modern Gemini API Client with header telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.get("/api/trucks", authenticateToken, async (req: any, res) => {
  try {
    const trucks = await Truck.find({ fleetId: req.user.fleetId });
    res.json(trucks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trucks", authenticateToken, authorizeRole(['owner']), async (req: any, res) => {
  try {
    const truck = new Truck({ ...req.body, fleetId: req.user.fleetId });
    await truck.save();
    res.json(truck);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/trucks/:id", authenticateToken, authorizeRole(['owner']), async (req: any, res) => {
  try {
    await Truck.findOneAndDelete({ _id: req.params.id, fleetId: req.user.fleetId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Anomaly and Audit Analysis API Proxy Route
app.post("/api/analyze", async (req, res) => {
  try {
    const { results } = req.body;
    if (!results) {
      return res.status(400).json({ error: "No IFTA calculation results provided for analysis" });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Graceful error handle if secret is missing, letting the user know through the UI
      return res.json({
        overall_risk: "MEDIUM",
        summary: "Notice: Gemini API key is missing in your Secrets configuration. This is a local preview analysis based on rule parameters.",
        anomalies: [
          {
            unit: "ALL",
            severity: "MEDIUM",
            type: "COMPLIANCE",
            title: "API Key Unconfigured",
            detail: "The GEMINI_API_KEY environment variable is not defined in the backend project environment.",
            recommendation: "Please navigate to Settings > Secrets in the AI Studio editor interface and register your GEMINI_API_KEY values."
          }
        ],
        optimizations: [
          {
            title: "Configure Secrets Manager",
            detail: "Integrating a valid Gemini API key permits deep cognitive analytics for fleet mileage data.",
            potential_savings: "Varies"
          }
        ],
        filing_checklist: [
          "Set up developer API key in Google AI Studio secrets manager",
          "Ensure base jurisdiction rates match matching quarters",
          "Keep physical invoices safely indexed for IFTA standard audit windows"
        ]
      });
    }

    const payloadText = JSON.stringify(results, null, 2);

    const prompt = `You are an expert IFTA (International Fuel Tax Agreement) tax compliance auditor and fleet coordinator.
Analyze the following compiled fleet results and identify anomalies, tax audit risks, fuel efficiency outliers (e.g. unusually high or low Miles Per Gallon - normal diesel rigs get 5.0 - 8.0 MPG), compliance concerns (e.g., states with miles driven but zero fuel purchases, or states with fuel purchases but zero miles), and cost-reduction jurisdictions.

Fleet calculation results to analyze:
${payloadText}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert transportation audit advisor. Review IFTA files rigorously and output pure JSON matching the requested schema. Provide clear recommendations.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overall_risk: {
              type: Type.STRING,
              description: "Overall tax audit risk of the current fleet dataset. Must be one of LOW, MEDIUM, or HIGH."
            },
            summary: {
              type: Type.STRING,
              description: "A professional 2-3 sentence overview assessment of the dataset, highlighting primary factors."
            },
            anomalies: {
              type: Type.ARRAY,
              description: "List of identified compliance exceptions, fuel discrepancies, or potential tax audits.",
              items: {
                type: Type.OBJECT,
                properties: {
                  unit: { type: Type.STRING, description: "Fleet vehicle unit identifier, or ALL if systemic." },
                  severity: { type: Type.STRING, description: "Discrepancy tier. Must be LOW, MEDIUM, or HIGH." },
                  type: { type: Type.STRING, description: "Classification identifier. Must be MPG, TAX, MILEAGE, FUEL, or COMPLIANCE." },
                  title: { type: Type.STRING, description: "A clear short 4-8 word title indicating the root finding." },
                  detail: { type: Type.STRING, description: "Direct evidence from the numbers, showing metrics, MPG, percentages, or missing gallons." },
                  recommendation: { type: Type.STRING, description: "Actionable corrective guidelines." }
                },
                required: ["unit", "severity", "type", "title", "detail", "recommendation"]
              }
            },
            optimizations: {
              type: Type.ARRAY,
              description: "Strategic fuel planning suggestions to save significant money (e.g., choosing states with lower tax or cheaper net pump ratings).",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Name of the savings lever." },
                  detail: { type: Type.STRING, description: "Concrete description of the fueling strategy." },
                  potential_savings: { type: Type.STRING, description: "Estimated financial benefit, e.g. '$250/truck' or '4% of diesel cost'." }
                },
                required: ["title", "detail", "potential_savings"]
              }
            },
            filing_checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "5 checklist steps to complete physically or electronically before signing the 505 quarterly tax return."
            }
          },
          required: ["overall_risk", "summary", "anomalies", "optimizations", "filing_checklist"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput);
    res.json(data);
  } catch (error: any) {
    console.error("Gemini server-side analysis failed:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred during AI parsing" });
  }
});

// AI OCR Fuel Receipt Extractor Endpoint
app.post("/api/ocr-receipt", async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing receipt image" });
    }

    // Handle offline fallback to mock OCR if GEMINI_API_KEY is not defined
    if (!process.env.GEMINI_API_KEY) {
      // Simulate quick extraction for beautiful responsive test actions
      const sampleVendors = ["Love's Travel Stops", "Pilot Flying J", "TA TravelCenter", "ExxonMobil", "Shell Depot"];
      const randomVendor = sampleVendors[Math.floor(Math.random() * sampleVendors.length)];
      const sampleStates = ["TX", "OK", "KS", "NM", "IL", "IN", "NE"];
      const randomState = sampleStates[Math.floor(Math.random() * sampleStates.length)];
      
      const randomGals = parseFloat((40 + Math.random() * 85).toFixed(2));
      const amountVal = parseFloat((randomGals * (3.10 + Math.random() * 0.75)).toFixed(2));
      const todayDate = new Date().toISOString().split("T")[0];

      return res.json({
        gallons: randomGals,
        date: todayDate,
        vendor: randomVendor,
        state: randomState,
        amount: amountVal,
        simulated: true,
        summary: "Notice: Simulating AI parsing locally (GEMINI_API_KEY missing in Secrets Settings)."
      });
    }

    // Strip out base64 visual header tag formatting
    let base64Data = image;
    let resolvedMimeType = mimeType || "image/jpeg";
    if (image.startsWith("data:")) {
      const parts = image.split(",");
      base64Data = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch) {
         resolvedMimeType = mimeMatch[1];
      }
    }

    const imagePart = {
      inlineData: {
        mimeType: resolvedMimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Analyze the image of this truck/diesel fuel receipt. Extract standard parameters: total gallons of diesel fuel purchased, date of transaction (as YYYY-MM-DD), name of vendor or truck stop franchise, 2-letter state code, and total raw dollars spent.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: "You are an AI receipt digitizing model. Extract physical variables from heavy vehicle fuel receipts and return JSON matching the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gallons: { type: Type.NUMBER, description: "Total gallons of diesel fuel purchased. Use float or int." },
            date: { type: Type.STRING, description: "Format date as 'YYYY-MM-DD'." },
            vendor: { type: Type.STRING, description: "The name of the fuel retailer, stop, pilot, shell, love, etc." },
            state: { type: Type.STRING, description: "The two-character state code designation, e.g. TX, OK." },
            amount: { type: Type.NUMBER, description: "Total raw decimal payment amount dollars paid." }
          },
          required: ["gallons", "date", "vendor", "state", "amount"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({ ...parsedData, simulated: false });
  } catch (error: any) {
    console.error("AI OCR Receipt extraction failed:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred during AI receipt scanner parsing" });
  }
});

// AI Route optimization & IFTA advisory endpoint
app.post("/api/route-optimize", async (req, res) => {
  try {
    const { startCity, endCity, stateTransitList, fuelTankCapacity } = req.body;
    if (!startCity || !endCity || !stateTransitList || stateTransitList.length === 0) {
      return res.status(400).json({ error: "Missing starting point, ending point, or transit jurisdictions" });
    }

    const tankGallons = fuelTankCapacity || 150;

    if (!process.env.GEMINI_API_KEY) {
      // Return beautiful compliance analytics simulation for the client
      const simulatedSavings = parseFloat((120 + Math.random() * 200).toFixed(2));
      const refuels = stateTransitList.map((st: string) => {
        const isLowTax = ["TX", "OK", "NM", "LA", "MS", "MO", "NV"].includes(st.toUpperCase());
        return {
          state: st.toUpperCase(),
          optimal_gallons: isLowTax ? Math.ceil(tankGallons * 0.8) : 0,
          estimated_price_per_gallon: isLowTax ? 3.12 : 3.84,
          reasoning: isLowTax 
            ? `Extremely low tax state (${st}). Refueling here delivers a high net IFTA discount.` 
            : `High regulatory tax burden state. Avoid purchasing high volumes here. Buy only bare minimum transiting gallons.`
        };
      }).filter(r => r.optimal_gallons > 0);

      return res.json({
        suggested_refuels: refuels,
        estimated_savings: simulatedSavings,
        alternate_route_advice: `Consider transiting via Oklahoma corridors rather than deep Illinois tollways where fuel taxes peak near $0.736/gal.`,
        general_summary: `Your route spans ${stateTransitList.length} states. Refueling heavily in lower tax jurisdictions and executing minimal bypass draws optimizes fuel expenditure.`,
        simulated: true
      });
    }

    const prompt = `Route planning optimization query for commercial carriage.
Vehicle coordinates parameters:
Origin: ${startCity}
Destination: ${endCity}
Transited jurisdictions: ${stateTransitList.join(", ")}
Average Tank Volume: ${tankGallons} Gallons

State Fuel Tax Rates (for reference):
TX: $0.20, OK: $0.19, KS: $0.24, IL: $0.736, IN: $0.57, OH: $0.47, PA: $0.741, NY: $0.441, CA: $0.41, NV: $0.27, AZ: $0.26, NM: $0.21, LA: $0.20, MS: $0.18, AL: $0.28, GA: $0.32, SC: $0.28, NC: $0.404, VA: $0.30, TN: $0.27, KY: $0.26

Examine how the fleet can minimize raw expenses and IFTA net surcharges. Suggest optimal fueling strategy.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert heavy cargo route and IFTA dispatch coordinator. Generate route advice for refueling.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggested_refuels: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  state: { type: Type.STRING, description: "2-letter uppercase state code" },
                  optimal_gallons: { type: Type.NUMBER, description: "Volume of diesel to pump at these locations" },
                  estimated_price_per_gallon: { type: Type.NUMBER, description: "Simulated tax weight pump price" },
                  reasoning: { type: Type.STRING, description: "Detailed financial rationale matching state IFTA rate indices" }
                },
                required: ["state", "optimal_gallons", "estimated_price_per_gallon", "reasoning"]
              }
            },
            estimated_savings: { type: Type.NUMBER, description: "Net simulated tax planning dollars saved ($)" },
            alternate_route_advice: { type: Type.STRING, description: "Shorter detour recommendation to bypass top tax zones" },
            general_summary: { type: Type.STRING, description: "Strategic 2-sentence dispatch digest summary" }
          },
          required: ["suggested_refuels", "estimated_savings", "alternate_route_advice", "general_summary"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({ ...parsedData, simulated: false });
  } catch (error: any) {
    console.error("AI Route optimization failed:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred during AI route analysis" });
  }
});

// AI Smart CSV Mapper Endpoint
app.post("/api/smart-map-csv", async (req, res) => {
  try {
    const { headers } = req.body;
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: "Missing headers array parameter" });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Dynamic local-regex based smart mapper mapping values gracefully
      const result: any = {
        unit_number_column: "",
        state_column: "",
        miles_column: "",
        gallons_column: "",
        date_column: "",
        vendor_column: ""
      };

      headers.forEach((h: string) => {
        const clean = h.toLowerCase().trim();
        if (clean.includes("unit") || clean.includes("truck") || clean.includes("veh") || clean.includes("car")) {
          result.unit_number_column = h;
        } else if (clean.includes("state") || clean.includes("juris") || clean.includes("st") || clean.includes("prov")) {
          result.state_column = h;
        } else if (clean.includes("mile") || clean.includes("odo") || clean.includes("dist") || clean.includes("km")) {
          result.miles_column = h;
        } else if (clean.includes("gal") || clean.includes("volume") || clean.includes("qty") || clean.includes("purch") || clean.includes("lit") || clean.includes("qty")) {
          result.gallons_column = h;
        } else if (clean.includes("date") || clean.includes("day") || clean.includes("trans")) {
          result.date_column = h;
        } else if (clean.includes("vend") || clean.includes("loc") || clean.includes("shop") || clean.includes("station") || clean.includes("merc")) {
          result.vendor_column = h;
        }
      });

      // Default fallbacks if empty to keep system resilient
      if (!result.unit_number_column && headers[0]) result.unit_number_column = headers[0];
      if (!result.state_column && headers[1]) result.state_column = headers[1];
      if (!result.miles_column && headers[2]) result.miles_column = headers[2];

      return res.json({
        ...result,
        simulated: true,
        summary: "Notice: Maps assigned via rule-based schema weights (GEMINI_API_KEY missing in Secrets Settings)."
      });
    }

    const prompt = `Map these CSV upload columns into the target canonical standard headers.
Standard target attributes:
1. unit_number_column (represents truck ID, unit code, tractor number, vehicle ID)
2. state_column (represents state code, province, jurisdiction, ST, location state)
3. miles_column (represents miles traveled, distance, odo miles, odom, odo finish minus start)
4. gallons_column (represents fuel gallons, gallons purchased, volume, fuel quantity, gallons pumped)
5. date_column (represents date of trip, day of fuel, purchase date, log date)
6. vendor_column (represents fuel retailer, truck stop name, station merchant, vendor)

Uploaded CSV Headers array:
${JSON.stringify(headers)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an AI column mapper. Determine which loaded column headers correspond to standard database identifiers. Output matching keys.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            unit_number_column: { type: Type.STRING, description: "Exactly match the raw header text mapping to truck unit/vehicle ID from candidate headers list." },
            state_column: { type: Type.STRING, description: "Exactly match the raw header text mapping to state/jurisdiction ST label." },
            miles_column: { type: Type.STRING, description: "Exactly match the raw header text mapping to distance or traveling odometer miles." },
            gallons_column: { type: Type.STRING, description: "Exactly match the raw header text mapping to fuel gallons purchased or volumes consumed." },
            date_column: { type: Type.STRING, description: "Exactly match the raw header text mapping to dates of transactions." },
            vendor_column: { type: Type.STRING, description: "Exactly match the raw header text mapping to vendor/merchant fuel stop identifiers." }
          },
          required: ["unit_number_column", "state_column", "miles_column", "gallons_column", "date_column", "vendor_column"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({ ...parsedData, simulated: false });
  } catch (error: any) {
    console.error("AI Smart CSV Map failed:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred during AI CSV smart header mapping" });
  }
});

// Configure Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`IFTA Pro Express Server running on port ${PORT}`);
    });
  } else {
    // In production (e.g. standard Node server), serve static files
    // But on Vercel, this part is often skipped as Vercel serves the static files directly
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Avoid sending index.html for /api routes in case of mismatch
      if (req.path.startsWith('/api')) return res.status(404).json({ error: "Not found" });
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

if (process.env.NODE_ENV !== "production") {
  startServer();
}

export default app;
