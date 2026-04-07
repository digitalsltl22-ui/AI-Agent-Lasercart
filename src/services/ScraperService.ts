export const ScraperService = {
  async scrapeUrl(url: string) {
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to scrape website");
    }

    return response.json();
  },
};
