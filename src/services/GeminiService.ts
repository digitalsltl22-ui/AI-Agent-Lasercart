import { LeadIntelligence, LeadDetail } from "../types";

export const GeminiService = {
  async analyzeWebsite(
    url: string,
    scrapedData: { title: string; metaDescription: string; content: string; links: string[] }
  ): Promise<LeadIntelligence> {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, scrapedData }),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze website");
    }

    return await response.json();
  },

  async chatWithAgent(
    message: string,
    history: { role: "user" | "model"; content: string }[],
    context: LeadIntelligence | null,
    onLeadCaptured?: (lead: LeadDetail) => void
  ) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, context }),
    });

    if (!response.ok) {
      throw new Error("Failed to chat with agent");
    }

    const data = await response.json();

    if (data.functionCalls && data.functionCalls.length > 0) {
      for (const call of data.functionCalls) {
        if (call.name === "saveLead") {
          const lead = call.args as any;
          onLeadCaptured?.({
            ...lead,
            timestamp: new Date().toLocaleString(),
          });
        }
      }
    }

    return data.text;
  },
};


