import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import fetch from "node-fetch";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_HARDCODED_KEY_HERE";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Scrape Website
  app.post("/api/scrape", async (req, res) => {
    // ... existing scrape logic ...
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script and style elements
      $("script, style, nav, footer, header").remove();

      const title = $("title").text();
      const metaDescription = $('meta[name="description"]').attr("content") || "";
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();

      // Extract links (potential social links)
      const links: string[] = [];
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (href) links.push(href);
      });

      res.json({
        title,
        metaDescription,
        content: bodyText.substring(0, 15000), // Limit content for LLM
        links: Array.from(new Set(links)),
      });
    } catch (error) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: "Failed to scrape website" });
    }
  });

  // API Route: Analyze Website
  app.post("/api/analyze", async (req, res) => {
    const { url, scrapedData } = req.body;
    try {
      const prompt = `
        Analyze the following website data and extract B2B lead intelligence.
        URL: ${url}
        Title: ${scrapedData.title}
        Meta Description: ${scrapedData.metaDescription}
        Content Snippet: ${scrapedData.content}
        Links: ${scrapedData.links.join(", ")}

        Rules:
        - Do NOT guess emails without strong pattern match.
        - Prefer accuracy over assumption.
        - If data missing -> return null.
        - Extract company name, industry, services, location, and decision makers.
        - Identify social media links from the provided links.
      `;

      const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              company_name: { type: Type.STRING },
              industry: { type: Type.STRING },
              website: { type: Type.STRING },
              emails: { type: Type.ARRAY, items: { type: Type.STRING } },
              phones: { type: Type.ARRAY, items: { type: Type.STRING } },
              owner: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                },
              },
              social_links: {
                type: Type.OBJECT,
                properties: {
                  linkedin: { type: Type.STRING },
                  facebook: { type: Type.STRING },
                  instagram: { type: Type.STRING },
                  twitter: { type: Type.STRING },
                  youtube: { type: Type.STRING },
                },
              },
              summary: { type: Type.STRING },
              services: { type: Type.ARRAY, items: { type: Type.STRING } },
              products: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.STRING },
                    size: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                },
              },
              location: { type: Type.STRING },
            },
          },
        },
      });

      res.json(JSON.parse(response.response.text()));
    } catch (error) {
      console.error("Analyze error:", error);
      res.status(500).json({ error: "Failed to analyze website" });
    }
  });

  // API Route: Chat with Agent
  app.post("/api/chat", async (req, res) => {
    const { message, history, context } = req.body;
    try {
      const systemInstruction = `
        You are a smart B2B Service Agent for ${context?.company_name || "a company"}.
        Knowledge Base: ${context ? JSON.stringify(context) : "No specific company data loaded yet."}
        Goals: Answer queries, explain services, handle objections, collect leads (Name, Email, Requirement).
        Tone: Professional, Helpful, Sales-oriented.
      `;

      const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction,
        tools: [{
          functionDeclarations: [{
            name: "saveLead",
            description: "Saves lead details",
            parameters: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                requirement: { type: Type.STRING },
              },
              required: ["name", "email", "requirement"],
            },
          }]
        }]
      });

      const chat = model.startChat({
        history: history.map((h: any) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        })),
      });

      const result = await chat.sendMessage(message);
      const responseText = result.response.text();
      const functionCalls = result.response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);

      res.json({
        text: responseText,
        functionCalls: functionCalls?.map(p => p.functionCall) || [],
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to chat with agent" });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
