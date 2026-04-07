import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { LeadIntelligence, LeadDetail } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const saveLeadFunction: FunctionDeclaration = {
  name: "saveLead",
  description: "Saves lead details (name, email, requirement) when a user shows interest or provides their information.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "The name of the lead" },
      email: { type: Type.STRING, description: "The email address of the lead" },
      requirement: { type: Type.STRING, description: "The specific requirement or interest expressed by the lead" },
    },
    required: ["name", "email", "requirement"],
  },
};

export const GeminiService = {
  // ... analyzeWebsite ...
  async analyzeWebsite(
    url: string,
    scrapedData: { title: string; metaDescription: string; content: string; links: string[] }
  ): Promise<LeadIntelligence> {
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
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
            location: { type: Type.STRING },
          },
        },
      },
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse Gemini response:", e);
      throw new Error("Failed to analyze website intelligence");
    }
  },

  async chatWithAgent(
    message: string,
    history: { role: "user" | "model"; content: string }[],
    context: LeadIntelligence | null,
    onLeadCaptured?: (lead: LeadDetail) => void
  ) {
    const systemInstruction = `
      You are a smart B2B Service Agent for ${context?.company_name || "a company"}.
      
      Knowledge Base:
      ${context ? JSON.stringify(context, null, 2) : "No specific company data loaded yet."}

      Your goals:
      1. Answer customer queries professionally and helpfully.
      2. Explain services offered by the company.
      3. Handle objections with a sales-oriented tone.
      4. Collect lead details (Name, Email, Requirement) if the user shows interest.
      
      Tone: Professional, Helpful, Sales-oriented.
      Rules:
      - Answer based on stored knowledge.
      - If data not found -> respond intelligently (do not hallucinate).
      - If you collect lead details, call the 'saveLead' function.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history.map(h => ({ role: h.role, parts: [{ text: h.content }] })).concat([{ role: "user", parts: [{ text: message }] }]),
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [saveLeadFunction] }],
      },
    });

    if (response.functionCalls) {
      for (const call of response.functionCalls) {
        if (call.name === "saveLead") {
          const lead = call.args as any;
          onLeadCaptured?.({
            ...lead,
            timestamp: new Date().toLocaleString(),
          });
          
          // Continue the conversation after function call
          const followUp = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: history.map(h => ({ role: h.role, parts: [{ text: h.content }] }))
              .concat([{ role: "user", parts: [{ text: message }] }])
              .concat([{ role: "model", parts: [{ functionCall: call }] }])
              .concat([{ role: "user", parts: [{ functionResponse: { name: "saveLead", response: { status: "success" } } }] }]),
            config: { systemInstruction },
          });
          return followUp.text;
        }
      }
    }

    return response.text;
  },
};

