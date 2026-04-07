/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Globe, MessageSquare, Database, Shield, Zap, LayoutDashboard, Send, User, Bot, Loader2, Mail, Phone, MapPin, Linkedin, Facebook, Instagram, Twitter, Youtube, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { LeadIntelligence, ChatMessage, LeadDetail } from "./types";
import { ScraperService } from "./services/ScraperService";
import { GeminiService } from "./services/GeminiService";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [intelligence, setIntelligence] = useState<LeadIntelligence | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "leads">("dashboard");
  const [leads, setLeads] = useState<LeadDetail[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
      const scrapedData = await ScraperService.scrapeUrl(url);
      const result = await GeminiService.analyzeWebsite(url, scrapedData);
      setIntelligence(result);
      setActiveTab("dashboard");
    } catch (error) {
      console.error(error);
      alert("Failed to analyze website. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isChatLoading) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);

    try {
      const response = await GeminiService.chatWithAgent(
        userMsg, 
        chatHistory, 
        intelligence,
        (newLead) => {
          setLeads(prev => [newLead, ...prev]);
        }
      );
      setChatHistory(prev => [...prev, { role: "model", content: response }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: "model", content: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-20 hidden md:flex flex-col">
        <div className="p-6 border-bottom border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Zap size={18} fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">LeadIntel</h1>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">AI Agent Platform</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
              activeTab === "dashboard" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <LayoutDashboard size={18} />
            Intelligence
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
              activeTab === "chat" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <MessageSquare size={18} />
            Service Agent
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
              activeTab === "leads" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Database size={18} />
            Lead Database
          </button>
        </nav>

        <div className="p-6 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-green-600" />
              <span className="text-xs font-semibold text-gray-700">Enterprise Secure</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              LeadIntel uses advanced encryption and privacy-first AI models.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <form onSubmit={handleAnalyze} className="relative w-full">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="url"
                placeholder="Enter website URL to analyze (e.g., https://example.com)"
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                Analyze
              </button>
            </form>
          </div>
          <div className="flex items-center gap-4 ml-8">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                  <img src={`https://picsum.photos/seed/${i + 10}/32/32`} alt="User" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8">
          {!intelligence && activeTab === "dashboard" ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto mt-20">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Globe size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-3">Start Your Intelligence Search</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Enter a company website URL above to extract deep lead intelligence, decision makers, and social signals.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="p-4 bg-white border border-gray-100 rounded-xl text-left">
                  <div className="text-blue-600 mb-2"><Search size={18} /></div>
                  <div className="text-xs font-bold mb-1">Deep Analysis</div>
                  <div className="text-[10px] text-gray-400">Industry, services, and location extraction.</div>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-xl text-left">
                  <div className="text-green-600 mb-2"><User size={18} /></div>
                  <div className="text-xs font-bold mb-1">Decision Makers</div>
                  <div className="text-[10px] text-gray-400">Identify Founders, CEOs, and Directors.</div>
                </div>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && intelligence && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-2xl font-bold">{intelligence.company_name || "Company Profile"}</h2>
                      <p className="text-sm text-gray-500">{intelligence.industry || "Industry Analysis"}</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={intelligence.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        <ExternalLink size={14} />
                        Visit Website
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Company Summary</h3>
                        <p className="text-gray-700 leading-relaxed italic font-serif text-lg">
                          "{intelligence.summary}"
                        </p>
                        {intelligence.services && intelligence.services.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Key Services</h4>
                            <div className="flex flex-wrap gap-2">
                              {intelligence.services.map((service, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-semibold">
                                  {service}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                            <Mail size={14} /> Contact Details
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Emails</div>
                              {intelligence.emails.length > 0 ? (
                                intelligence.emails.map((email, i) => (
                                  <div key={i} className="text-sm font-mono text-blue-600 hover:underline cursor-pointer">{email}</div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-400 italic">No emails found</div>
                              )}
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Phone Numbers</div>
                              {intelligence.phones.length > 0 ? (
                                intelligence.phones.map((phone, i) => (
                                  <div key={i} className="text-sm font-mono">{phone}</div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-400 italic">No phone numbers found</div>
                              )}
                            </div>
                            {intelligence.location && (
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                                  <MapPin size={10} /> Location
                                </div>
                                <div className="text-sm">{intelligence.location}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                            <User size={14} /> Decision Maker
                          </h3>
                          {intelligence.owner.name ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                  <User size={24} />
                                </div>
                                <div>
                                  <div className="font-bold text-lg">{intelligence.owner.name}</div>
                                  <div className="text-sm text-gray-500">{intelligence.owner.role}</div>
                                </div>
                              </div>
                              <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Confidence Score</span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                    intelligence.owner.confidence === "High" ? "bg-green-100 text-green-700" :
                                    intelligence.owner.confidence === "Medium" ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                  )}>
                                    {intelligence.owner.confidence}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 italic">No decision maker data identified</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Social Signals</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(intelligence.social_links).map(([platform, url]) => (
                            url ? (
                              <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                              >
                                {platform === "linkedin" && <Linkedin size={16} className="text-[#0A66C2]" />}
                                {platform === "facebook" && <Facebook size={16} className="text-[#1877F2]" />}
                                {platform === "instagram" && <Instagram size={16} className="text-[#E4405F]" />}
                                {platform === "twitter" && <Twitter size={16} className="text-[#1DA1F2]" />}
                                {platform === "youtube" && <Youtube size={16} className="text-[#FF0000]" />}
                                <span className="text-[10px] font-bold uppercase text-gray-600 group-hover:text-gray-900">{platform}</span>
                              </a>
                            ) : null
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-60 mb-4">Service Agent</h3>
                        <p className="text-sm mb-6 leading-relaxed">
                          The AI Service Agent is ready to represent {intelligence.company_name || "this company"}.
                        </p>
                        <button
                          onClick={() => setActiveTab("chat")}
                          className="w-full py-3 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
                        >
                          Launch Agent
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "chat" && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden"
                >
                  {/* Chat Header */}
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <Bot size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold">Service Agent</h3>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Online & Ready</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      Representing: <span className="text-gray-900 font-bold">{intelligence?.company_name || "Unknown Company"}</span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                    {chatHistory.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-50">
                        <MessageSquare size={48} className="text-gray-300 mb-4" />
                        <p className="text-sm">Start a conversation with the Service Agent. It knows everything about the analyzed company.</p>
                      </div>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "")}>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-blue-600"
                        )}>
                          {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={cn(
                          "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                          msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center animate-pulse">
                          <Bot size={14} />
                        </div>
                        <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-6 bg-white border-t border-gray-100">
                    <form onSubmit={handleSendMessage} className="relative">
                      <input
                        type="text"
                        placeholder="Ask about services, pricing, or request a demo..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || isChatLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {activeTab === "leads" && (
                <motion.div
                  key="leads"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-2xl font-bold">Lead Database</h2>
                      <p className="text-sm text-gray-500">Captured leads from agent interactions</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Timestamp</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Contact Name</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Requirement</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                              No leads captured yet. The agent will collect details during conversations.
                            </td>
                          </tr>
                        ) : (
                          leads.map((lead, i) => (
                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 text-xs font-mono text-gray-400">{lead.timestamp}</td>
                              <td className="px-6 py-4 text-sm font-bold">{lead.name}</td>
                              <td className="px-6 py-4 text-sm text-blue-600">{lead.email}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{lead.requirement}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">New</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}

