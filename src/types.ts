export interface Product {
  name: string;
  price: string | null;
  size: string | null;
  quantity: string | null;
  description: string | null;
}

export interface LeadIntelligence {
  company_name: string | null;
  industry: string | null;
  website: string;
  emails: string[];
  phones: string[];
  owner: {
    name: string | null;
    role: string | null;
    confidence: "High" | "Medium" | "Low" | null;
  };
  social_links: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  summary: string | null;
  services?: string[];
  products?: Product[];
  location?: string | null;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface LeadDetail {
  name: string;
  email: string;
  requirement: string;
  timestamp: string;
}
