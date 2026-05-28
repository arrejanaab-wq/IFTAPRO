import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize the modern Gemini API Client with header telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
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

// Configure Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IFTA Pro Express Server running on port ${PORT}`);
  });
}

startServer();
