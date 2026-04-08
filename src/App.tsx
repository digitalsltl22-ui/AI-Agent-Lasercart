/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Search, Globe, MessageSquare, Database, Shield, Zap, LayoutDashboard, Send, User, Bot, Loader2, Mail, Phone, MapPin, Linkedin, Facebook, Instagram, Twitter, Youtube, ExternalLink, Code, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { LeadIntelligence, ChatMessage, LeadDetail } from "./types";
import { ScraperService } from "./services/ScraperService";
import { GeminiService } from "./services/GeminiService";
import { db, auth, OperationType, handleFirestoreError } from "./firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [intelligence, setIntelligence] = useState<LeadIntelligence | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "leads" | "embed">("dashboard");
  const [leads, setLeads] = useState<LeadDetail[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isWidget, setIsWidget] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch(err => console.error("Auth error:", err));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "leads"),
      where("createdBy", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()?.toLocaleString() || new Date().toLocaleString()
      })) as LeadDetail[];
      setLeads(leadsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "leads");
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("widget") === "true") {
      setIsWidget(true);
      setActiveTab("chat");
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
      const scrapedData = await ScraperService.scrapeUrl(url);
      const result = await GeminiService.analyzeWebsite(url, scrapedData);
      setIntelligence(result);
      
      if (user) {
        await addDoc(collection(db, "intelligence"), {
          ...result,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
      }

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
        async (newLead) => {
          if (user) {
            try {
              await addDoc(collection(db, "leads"), {
                ...newLead,
                timestamp: serverTimestamp(),
                createdBy: user.uid,
                website: intelligence?.website || ""
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, "leads");
            }
          }
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

  if (isWidget) {
    return (
      <div className="h-screen bg-white flex flex-col">
        {/* Simplified Chat for Widget */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
          {chatHistory.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-blue-600"
              )}>
                {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
              </div>
              <div className={cn(
                "max-w-[85%] p-3 rounded-xl text-sm leading-relaxed shadow-sm",
                msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center animate-pulse">
                <Bot size={12} />
              </div>
              <div className="bg-white border border-gray-100 p-3 rounded-xl rounded-tl-none shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isChatLoading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => setActiveTab("embed")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
              activeTab === "embed" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Code size={18} />
            Embed Script
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

                        {intelligence.products && intelligence.products.length > 0 && (
                          <div className="mt-8 pt-8 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Product Catalog</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {intelligence.products.map((product, i) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-sm">{product.name}</div>
                                    {product.price && <div className="text-blue-600 font-bold text-xs">{product.price}</div>}
                                  </div>
                                  {product.description && <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{product.description}</p>}
                                  <div className="flex gap-4">
                                    {product.size && (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] text-gray-400 uppercase font-bold">Size</span>
                                        <span className="text-[11px] font-medium">{product.size}</span>
                                      </div>
                                    )}
                                    {product.quantity && (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] text-gray-400 uppercase font-bold">Qty</span>
                                        <span className="text-[11px] font-medium">{product.quantity}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
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

              {activeTab === "embed" && (
                <motion.div
                  key="embed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6 max-w-4xl"
                >
                  <div>
                    <h2 className="text-2xl font-bold">Embed Your Agent</h2>
                    <p className="text-sm text-gray-500">Copy the script below to add the LeadIntel agent to your website.</p>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Installation Script</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Paste this code snippet into the <code className="bg-gray-100 px-1 rounded text-blue-600">&lt;body&gt;</code> of your website to enable the floating chat widget.
                      </p>
                      
                      <div className="relative group">
                        <pre className="bg-gray-900 text-gray-100 p-6 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed">
{`<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = "${window.location.origin}/?widget=true";
    iframe.style.position = 'fixed';
    iframe.style.bottom = '20px';
    iframe.style.right = '20px';
    iframe.style.width = '400px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '24px';
    iframe.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
    iframe.style.zIndex = '9999';
    document.body.appendChild(iframe);
  })();
</script>`}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(`<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = "${window.location.origin}/?widget=true";
    iframe.style.position = 'fixed';
    iframe.style.bottom = '20px';
    iframe.style.right = '20px';
    iframe.style.width = '400px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '24px';
    iframe.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
    iframe.style.zIndex = '9999';
    document.body.appendChild(iframe);
  })();
</script>`)}
                          className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                        >
                          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Zap size={16} />
                          <span className="text-xs font-bold uppercase tracking-wider">Instant Sync</span>
                        </div>
                        <p className="text-xs text-gray-500">Any updates to your agent's intelligence are automatically synced to your website.</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <Shield size={16} />
                          <span className="text-xs font-bold uppercase tracking-wider">Secure Hosting</span>
                        </div>
                        <p className="text-xs text-gray-500">The widget runs in a secure sandbox, protecting your site's data.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 items-start">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900 mb-1">Pro Tip: Custom Styling</h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        You can adjust the <code className="bg-blue-100 px-1 rounded">width</code> and <code className="bg-blue-100 px-1 rounded">height</code> in the script to better fit your website's design.
                      </p>
                    </div>
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

