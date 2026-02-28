/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  Search, 
  Activity, 
  Globe, 
  Zap,
  ShieldCheck,
  Target,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  BarChart3,
  History,
  BookOpen,
  LayoutDashboard,
  Clock,
  Trash2,
  LogOut,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeChart } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { AnalysisResult } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'dashboard' | 'history' | 'methodology';
type AuthStatus = 'unauthorized' | 'user' | 'admin';

interface AccessCode {
  code: string;
  expiry: number;
  duration: number;
  createdAt: number;
}

const MASTER_CODE = 'rFOt4cPdfyeFCNrB';

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unauthorized');
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loginCode, setLoginCode] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isGeminiConfigured = !!process.env.GEMINI_API_KEY;
  const [isLoadingData, setIsLoadingData] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history and access codes from Supabase (with localStorage fallback)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      
      if (isSupabaseConfigured) {
        // Fetch Access Codes from Supabase
        const { data: codes, error: codesError } = await supabase
          .from('access_codes')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!codesError && codes) {
          setAccessCodes(codes.map(c => ({
            code: c.code,
            expiry: c.expiry,
            duration: c.duration,
            createdAt: c.created_at
          })));
        }

        // Fetch History from Supabase
        const { data: historyData, error: historyError } = await supabase
          .from('history')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(20);
        
        if (!historyError && historyData) {
          setHistory(historyData.map(h => h.data as AnalysisResult));
        }
      } else {
        // Fallback to localStorage
        const savedHistory = localStorage.getItem('vertex_history');
        if (savedHistory) {
          try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
        }
        const savedCodes = localStorage.getItem('vertex_access_codes');
        if (savedCodes) {
          try { setAccessCodes(JSON.parse(savedCodes)); } catch (e) { console.error(e); }
        }
      }

      setIsLoadingData(false);
    };

    fetchData();

    // Check session
    const session = sessionStorage.getItem('vertex_session');
    if (session === 'admin') {
      setAuthStatus('admin');
    } else if (session === 'user') {
      setAuthStatus('user');
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic image compression/resizing
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension 1280px
          const maxDim = 1280;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Use JPEG with 0.8 quality
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setImage(compressed);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!image) {
      setError('Please upload a chart image first.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeChart(image);
      setResult(data);
      
      // Save to Supabase
      if (isSupabaseConfigured) {
        await supabase.from('history').insert([{
          data: data,
          timestamp: data.timestamp
        }]);
      } else {
        localStorage.setItem('vertex_history', JSON.stringify([data, ...history].slice(0, 20)));
      }

      setHistory(prev => [data, ...prev].slice(0, 20));
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = async () => {
    if (!isSupabaseConfigured) {
      setHistory([]);
      localStorage.removeItem('vertex_history');
      return;
    }
    const { error } = await supabase.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (!error) {
      setHistory([]);
    } else {
      setError('Failed to clear history from database.');
    }
  };

  const loadingMessages = [
    "Transmuting market data...",
    "Decoding ICT liquidity pools...",
    "Calculating Alchemist SNR levels...",
    "Scanning macro fundamental landscape...",
    "Synthesizing trade signal...",
    "Filtering market noise...",
  ];

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleUserLogin = () => {
    const now = Date.now();
    const validCode = accessCodes.find(c => c.code === loginCode && now < c.expiry);
    
    if (validCode) {
      setAuthStatus('user');
      sessionStorage.setItem('vertex_session', 'user');
      setError(null);
    } else {
      setError('Invalid or Expired Access Code');
    }
  };

  const handleAdminLogin = () => {
    if (adminCode === MASTER_CODE) {
      setAuthStatus('admin');
      sessionStorage.setItem('vertex_session', 'admin');
      setError(null);
    } else {
      setError('Invalid Master Code');
    }
  };

  const logout = () => {
    setAuthStatus('unauthorized');
    sessionStorage.removeItem('vertex_session');
    setLoginCode('');
    setAdminCode('');
  };

  const generateCode = async (days: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const now = Date.now();
    const newCode: AccessCode = {
      code,
      duration: days,
      createdAt: now,
      expiry: now + (days * 24 * 60 * 60 * 1000)
    };
    
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('access_codes').insert([{
        code: newCode.code,
        duration: newCode.duration,
        created_at: newCode.createdAt,
        expiry: newCode.expiry
      }]);

      if (error) {
        setError('Failed to save code to database.');
        return;
      }
    } else {
      const updatedCodes = [newCode, ...accessCodes];
      localStorage.setItem('vertex_access_codes', JSON.stringify(updatedCodes));
    }
    
    setAccessCodes(prev => [newCode, ...prev]);
  };

  const deleteCode = async (code: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('access_codes').delete().eq('code', code);
      if (error) {
        setError('Failed to delete code from database.');
        return;
      }
    } else {
      const updatedCodes = accessCodes.filter(c => c.code !== code);
      localStorage.setItem('vertex_access_codes', JSON.stringify(updatedCodes));
    }
    setAccessCodes(prev => prev.filter(c => c.code !== code));
  };

  return (
    <AnimatePresence mode="wait">
      {authStatus === 'unauthorized' ? (
        <motion.div 
          key="unauthorized"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-alchemist-bg flex items-center justify-center p-4 font-sans relative overflow-hidden"
        >
          {/* Immersive Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gold/5 blur-[160px] rounded-full" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-gold/5 blur-[160px] rounded-full" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.03]" />
          </div>

          <div className="max-w-sm w-full space-y-8 relative z-10">
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center space-y-2"
            >
              <h1 className="text-5xl font-display font-bold text-white tracking-tighter">
                Vertex<span className="text-gold italic">Chart</span>
              </h1>
              <p className="text-[10px] font-serif italic text-gray-500 uppercase tracking-[0.4em]">Refined Intelligence</p>
            </motion.div>

            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-alchemist-card/20 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-xl relative overflow-hidden"
            >
              <div className="space-y-8 relative z-10">
                <div className="space-y-6">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                      placeholder="ACCESS CODE"
                      className="w-full bg-white/[0.02] border-b border-white/10 px-4 py-4 text-white font-serif focus:border-gold/30 outline-none transition-all text-center tracking-[0.3em] text-lg"
                    />
                  </div>

                  <button 
                    onClick={handleUserLogin}
                    className="w-full bg-gold hover:bg-gold-muted text-black font-serif italic font-bold py-4 rounded-xl transition-all duration-500 shadow-lg hover:shadow-gold/5 uppercase tracking-[0.2em] text-xs"
                  >
                    Enter
                  </button>
                </div>

                <div className="pt-4 flex flex-col items-center gap-2">
                  {showAdminInput ? (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-2">
                      <input 
                        type="password" 
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="MASTER KEY"
                        className="w-full bg-transparent border-b border-white/10 px-4 py-2 text-white font-serif focus:border-gold/30 outline-none transition-all text-center text-[10px] tracking-[0.3em]"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                      />
                      <button 
                        onClick={handleAdminLogin}
                        className="w-full text-gold/40 hover:text-gold font-serif italic text-[9px] uppercase tracking-widest"
                      >
                        Verify Key
                      </button>
                    </motion.div>
                  ) : (
                    <button 
                      onClick={() => setShowAdminInput(true)}
                      className="text-gray-600 hover:text-gold/40 font-serif italic uppercase tracking-[0.3em] text-[9px]"
                    >
                      Admin
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/5 border border-red-500/10 text-red-400/80 p-4 rounded-2xl text-center text-[11px] font-serif italic tracking-wider"
              >
                {error}
              </motion.div>
            )}

            <div className="text-center">
              <p className="text-[10px] font-serif italic text-gray-700 uppercase tracking-[0.6em]">Established MMXXVI</p>
            </div>
          </div>
        </motion.div>
      ) : authStatus === 'admin' ? (
        <motion.div 
          key="admin"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          className="min-h-screen bg-alchemist-bg text-gray-100 font-sans p-4 md:p-8"
        >
          <div className="max-w-5xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-white">Admin <span className="text-gold italic">Panel</span></h1>
                <p className="text-[11px] font-serif italic text-gray-500 uppercase tracking-widest">Access Management Suite</p>
              </div>
              <button 
                onClick={logout}
                className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
              >
                LOGOUT
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <section className="lg:col-span-1 bg-alchemist-card border border-alchemist-border rounded-3xl p-8 space-y-6 h-fit">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Generate Code
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: '1 HOUR', days: 1/24 },
                    { label: '5 HOURS', days: 5/24 },
                    { label: '3 DAYS', days: 3 },
                    { label: '7 DAYS', days: 7 },
                    { label: '30 DAYS', days: 30 }
                  ].map(option => (
                    <button 
                      key={option.label}
                      onClick={() => generateCode(option.days)}
                      className="w-full bg-white/5 hover:bg-gold/10 hover:border-gold/30 border border-white/5 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-between px-6 group"
                    >
                      <span className="text-gray-400 group-hover:text-gold">{option.label} ACCESS</span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gold" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="lg:col-span-2 bg-alchemist-card border border-alchemist-border rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-alchemist-border flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white">Active Codes</h2>
                  <span className="text-[11px] font-serif italic text-gray-500">{accessCodes.length} CODES TOTAL</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="px-8 py-4 text-[11px] font-serif italic text-gray-500 uppercase tracking-widest">Code</th>
                            <th className="px-8 py-4 text-[11px] font-serif italic text-gray-500 uppercase tracking-widest">Duration</th>
                            <th className="px-8 py-4 text-[11px] font-serif italic text-gray-500 uppercase tracking-widest">Expires</th>
                            <th className="px-8 py-4 text-[11px] font-serif italic text-gray-500 uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                    <tbody className="divide-y divide-alchemist-border">
                      {accessCodes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-12 text-center text-gray-600 font-serif italic">No codes generated yet.</td>
                        </tr>
                      ) : (
                        accessCodes.map((item) => (
                          <tr key={item.code} className="hover:bg-white/5 transition-colors group">
                            <td className="px-8 py-4 font-serif italic text-gold font-bold tracking-widest">{item.code}</td>
                            <td className="px-8 py-4 text-sm text-gray-400">
                              {item.duration < 1 
                                ? `${Math.round(item.duration * 24)} Hours` 
                                : `${item.duration} Days`}
                            </td>
                            <td className="px-8 py-4 text-xs text-gray-500">
                              {new Date(item.expiry).toLocaleDateString()}
                              <div className="text-[10px] opacity-50">{new Date(item.expiry).toLocaleTimeString()}</div>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <button 
                                onClick={() => deleteCode(item.code)}
                                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="user"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen font-sans selection:bg-gold/30 bg-alchemist-bg text-gray-100 pb-20 md:pb-0 relative overflow-hidden"
        >
          {/* Background Glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold/5 blur-[140px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-gold/5 blur-[140px] rounded-full" />
          </div>

      {/* Navigation - Sidebar for Desktop, Bottom Bar for Mobile */}
      <nav className="fixed bottom-0 left-0 w-full h-20 bg-alchemist-card/80 backdrop-blur-2xl border-t border-white/5 flex flex-row items-center justify-around px-4 z-50 md:fixed md:left-0 md:top-0 md:h-full md:w-24 md:border-t-0 md:border-r md:flex-col md:py-12 md:px-0">
        <div className="hidden md:flex w-16 h-16 bg-gold/5 rounded-2xl items-center justify-center border border-gold/10 mb-16">
          <Zap className="text-gold w-8 h-8" />
        </div>

        <div className="flex flex-row md:flex-col gap-4 md:gap-8 flex-1 items-center justify-around w-full md:w-auto">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard />} 
            label="Dash" 
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History />} 
            label="History" 
          />
          <NavButton 
            active={activeTab === 'methodology'} 
            onClick={() => setActiveTab('methodology')} 
            icon={<BookOpen />} 
            label="Method" 
          />
        </div>

        <div className="hidden md:block mt-auto">
          <div className="w-10 h-10 rounded-full bg-alchemist-border flex items-center justify-center text-[10px] font-bold text-gray-400">
            VC
          </div>
        </div>
      </nav>

      <div className="md:pl-20">
        {/* Header */}
        <header className="h-24 border-b border-white/5 bg-alchemist-bg/50 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-10 h-10 bg-gold/5 rounded-xl flex items-center justify-center border border-gold/10">
              <Zap className="text-gold w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
                Vertex<span className="text-gold italic">Chart</span>
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-[1px] w-6 bg-gold/20" />
                <p className="text-[9px] md:text-[11px] uppercase tracking-[0.3em] text-gold/60 font-serif italic">
                  {activeTab === 'dashboard' ? 'Analytical Intelligence' : 
                   activeTab === 'history' ? 'Historical Archive' : 
                   'The Alchemist Methodology'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-serif italic text-emerald-500 uppercase tracking-widest">Repository: Online</span>
              <span className="text-[10px] font-serif italic text-gray-600 uppercase tracking-widest">Precision: 99.9%</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-gray-600 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Left: Input */}
                <div className="lg:col-span-5 space-y-6">
                  <section className="bg-alchemist-card border border-alchemist-border rounded-3xl p-6 md:p-8 relative overflow-hidden group">
                    <div className="scanline opacity-10" />
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                      <BarChart3 className="w-12 h-12 text-gold" />
                    </div>

                    <h2 className="text-xs font-serif italic uppercase tracking-[0.2em] text-gold mb-8 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                      Chart Ingestion
                    </h2>

                    <div className="space-y-6">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed border-alchemist-border rounded-3xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-gold/40 transition-all group relative overflow-hidden bg-alchemist-bg/50",
                          image ? "border-none shadow-2xl" : ""
                        )}
                      >
                        {image ? (
                          <>
                            <img src={image} alt="Chart" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="text-white w-8 h-8" />
                              <p className="text-white text-xs font-serif italic uppercase tracking-widest">Replace Chart</p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-alchemist-card rounded-2xl flex items-center justify-center mx-auto border border-alchemist-border group-hover:scale-110 group-hover:border-gold/30 transition-all duration-500">
                              <Upload className="text-gray-500 w-8 h-8 group-hover:text-gold" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-300">Drag & Drop Chart</p>
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest">PNG, JPG, WEBP</p>
                            </div>
                          </div>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          className="hidden" 
                          accept="image/*"
                        />
                      </div>

                      <button 
                        onClick={runAnalysis}
                        disabled={isAnalyzing || !image}
                        className="w-full bg-gold hover:bg-gold/90 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-black font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-gold/10 group active:scale-[0.98]"
                      >
                        {isAnalyzing ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Zap className="w-5 h-5 group-hover:scale-125 transition-transform" />
                        )}
                        <span className="tracking-widest uppercase text-sm">
                          {isAnalyzing ? 'Transmuting...' : 'Execute Analysis'}
                        </span>
                      </button>
                    </div>
                  </section>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl flex items-center gap-4 text-sm"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </div>

                {/* Right: Results */}
                <div className="lg:col-span-7">
                  <AnimatePresence mode="wait">
                    {isAnalyzing ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full min-h-[500px] flex flex-col items-center justify-center space-y-10 bg-alchemist-card border border-alchemist-border rounded-3xl p-12 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent opacity-20" />
                        <div className="relative">
                          <div className="w-32 h-32 border-[6px] border-gold/5 border-t-gold rounded-full animate-spin" />
                          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold w-10 h-10 animate-pulse" />
                        </div>
                        <div className="text-center space-y-3 relative z-10 px-4">
                          <motion.p 
                            key={loadingMsgIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xl md:text-2xl font-serif italic text-white"
                          >
                            {loadingMessages[loadingMsgIndex]}
                          </motion.p>
                          <p className="text-[11px] font-serif italic text-gray-600 uppercase tracking-[0.5em]">Analytical Synthesis</p>
                        </div>
                      </motion.div>
                    ) : result ? (
                      <motion.div 
                        key="result"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        {/* Signal Card */}
                        <section className={cn(
                          "relative overflow-hidden rounded-3xl border-2 p-6 md:p-10 transition-all shadow-2xl",
                          result.signal.action === 'BUY' ? "bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5" : 
                          result.signal.action === 'SELL' ? "bg-red-500/5 border-red-500/20 shadow-red-500/5" : 
                          "bg-gray-500/5 border-gray-500/20 shadow-gray-500/5"
                        )}>
                          <div className="absolute top-0 right-0 p-4 md:p-6">
                            <div className={cn(
                              "px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase border",
                              result.signal.action === 'BUY' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                              result.signal.action === 'SELL' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                              "bg-gray-500/10 text-gray-400 border-gray-500/20"
                            )}>
                              {result.signal.confidence}% Confidence
                            </div>
                          </div>

                          <div className="space-y-8 md:space-y-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                              <div className="space-y-2">
                                <p className="text-[11px] font-serif italic text-gray-600 uppercase tracking-[0.3em]">Strategic Insight</p>
                                <div className="flex items-center gap-4 md:gap-6">
                                  <div className={cn(
                                    "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center border-2",
                                    result.signal.action === 'BUY' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : 
                                    result.signal.action === 'SELL' ? "bg-red-500/10 border-red-500/30 text-red-500" : 
                                    "bg-gray-500/10 border-gray-500/30 text-gray-500"
                                  )}>
                                    {result.signal.action === 'BUY' ? <TrendingUp className="w-6 h-6 md:w-8 md:h-8" /> : 
                                     result.signal.action === 'SELL' ? <TrendingDown className="w-6 h-6 md:w-8 md:h-8" /> : 
                                     <Activity className="w-6 h-6 md:w-8 md:h-8" />}
                                  </div>
                                  <div>
                                    <h3 className={cn(
                                      "text-5xl md:text-7xl font-serif font-bold italic leading-none tracking-tighter",
                                      result.signal.action === 'BUY' ? "text-emerald-500" : 
                                      result.signal.action === 'SELL' ? "text-red-500" : 
                                      "text-gray-500"
                                    )}>
                                      {result.signal.action}
                                    </h3>
                                    <p className="text-[11px] md:text-xs font-serif italic text-gray-500 mt-1 md:mt-2">{result.signal.pair} // COLLECTED</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 text-gold">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-xs font-serif italic">{new Date(result.timestamp).toLocaleTimeString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <SignalMetric label="Entry Price" value={result.signal.entry} color="white" />
                              <SignalMetric label="Take Profit" value={result.signal.tp} color="emerald" />
                              <SignalMetric label="Stop Loss" value={result.signal.sl} color="red" />
                            </div>

                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-sm text-gray-300 leading-relaxed italic font-serif">
                                "{result.signal.reasoning}"
                              </p>
                            </div>
                          </div>
                        </section>

                        {/* Technical Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <TechCard title="SNR Analysis" icon={<Target />} content={result.technical.snr} />
                          <TechCard title="ICT Concepts" icon={<Zap />} content={result.technical.ict} />
                          <TechCard title="Volatility (STD)" icon={<BarChart3 />} content={result.technical.std} />
                          <TechCard title="Alchemist X MSNR" icon={<ShieldCheck />} content={result.technical.alchemist} />
                        </div>

                        {/* Fundamental Section */}
                        <section className="bg-alchemist-card border border-alchemist-border rounded-3xl p-8 space-y-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Globe className="w-32 h-32 text-gold" />
                          </div>
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3 text-gold">
                              <div className="w-8 h-8 bg-gold/10 rounded-lg flex items-center justify-center border border-gold/20">
                                <Globe className="w-4 h-4" />
                              </div>
                              <h4 className="text-sm font-bold uppercase tracking-[0.2em]">Global Macro Context</h4>
                            </div>
                          </div>
                          <div className="text-sm text-gray-400 leading-relaxed markdown-body relative z-10">
                            <Markdown>{result.fundamental}</Markdown>
                          </div>
                        </section>

                        <div className="flex justify-center pt-4">
                            <button 
                              onClick={() => setResult(null)}
                              className="text-[11px] font-serif italic text-gray-600 hover:text-gold transition-colors flex items-center gap-2 uppercase tracking-widest"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Reset Analytical Suite
                            </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full min-h-[600px] flex flex-col items-center justify-center text-center space-y-8 bg-alchemist-card/20 border-2 border-dashed border-alchemist-border rounded-3xl p-12"
                      >
                        <div className="relative">
                          <div className="w-24 h-24 bg-alchemist-card rounded-3xl flex items-center justify-center border border-alchemist-border rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-2xl">
                            <BarChart3 className="text-gray-600 w-10 h-10" />
                          </div>
                          <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/20 animate-bounce">
                            <Zap className="text-gold w-6 h-6" />
                          </div>
                        </div>
                        <div className="max-w-sm space-y-3">
                          <h3 className="text-2xl font-serif italic text-white">Awaiting Market Data</h3>
                          <p className="text-sm text-gray-500 leading-relaxed">
                            Upload a chart image to initiate the Alchemist transmutation process. 
                            Our engine will decode SNR, ICT, and Macro data instantly.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-8 pt-8">
                          <FeatureStep icon={<ShieldCheck />} label="SNR/ICT" />
                          <FeatureStep icon={<Zap />} label="ALCHEMIST" />
                          <FeatureStep icon={<Target />} label="SIGNAL" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-serif font-bold italic text-white">Historical Transmutations</h2>
                  {history.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="text-xs font-serif italic text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      CLEAR ALL
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="h-96 flex flex-col items-center justify-center text-center space-y-4 bg-alchemist-card border border-alchemist-border rounded-3xl">
                    <History className="w-12 h-12 text-gray-700" />
                    <p className="text-gray-500 font-serif italic">No past analyses recorded.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {history.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-alchemist-card border border-alchemist-border rounded-2xl p-6 hover:border-gold/30 transition-all group cursor-pointer"
                        onClick={() => {
                          setResult(item);
                          setActiveTab('dashboard');
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center border",
                              item.signal.action === 'BUY' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : 
                              item.signal.action === 'SELL' ? "bg-red-500/10 border-red-500/20 text-red-500" : 
                              "bg-gray-500/10 border-gray-500/20 text-gray-500"
                            )}>
                              {item.signal.action === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="font-serif italic font-bold text-white tracking-tight">{item.signal.pair}</h4>
                              <p className="text-[11px] font-serif italic text-gray-700">{new Date(item.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "text-xs font-bold",
                              item.signal.action === 'BUY' ? "text-emerald-500" : "text-red-500"
                            )}>
                              {item.signal.action}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2 italic mb-4">"{item.signal.reasoning}"</p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <div className="flex gap-4">
                            <div className="text-[11px] font-serif italic">
                              <span className="text-gray-600 mr-1">TP:</span>
                              <span className="text-emerald-500">{item.signal.tp}</span>
                            </div>
                            <div className="text-[11px] font-serif italic">
                              <span className="text-gray-600 mr-1">SL:</span>
                              <span className="text-red-500">{item.signal.sl}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gold transition-colors" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'methodology' && (
              <motion.div 
                key="methodology"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="max-w-3xl space-y-4">
                  <h2 className="text-4xl font-serif font-bold italic text-white">The Alchemist Methodology</h2>
                  <p className="text-gray-400 leading-relaxed font-serif italic">
                    VertexChart combines institutional concepts with advanced algorithmic analysis to provide 
                    high-probability market directives. Our engine synthesizes four core pillars of trading.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <MethodCard 
                    title="SNR (Support & Resistance)" 
                    icon={<Target className="text-blue-400" />}
                    description="Identifying key psychological and historical price levels. We prioritize 'Fresh' zones that haven't been mitigated, as they hold the highest probability of reaction."
                  />
                  <MethodCard 
                    title="ICT (Institutional Concepts)" 
                    icon={<Zap className="text-gold" />}
                    description="Decoding the footprints of 'Smart Money'. We look for Order Blocks, Fair Value Gaps (FVG), and Liquidity Sweeps to identify where big players are entering the market."
                  />
                  <MethodCard 
                    title="STD (Standard Deviation)" 
                    icon={<BarChart3 className="text-purple-400" />}
                    description="Measuring market volatility through statistical variance. Standard Deviation bands help us identify overextended price moves that are ripe for mean reversion."
                  />
                  <MethodCard 
                    title="Alchemist X MSNR" 
                    icon={<ShieldCheck className="text-emerald-400" />}
                    description="Our proprietary layer focusing on 'Manipulation SNR'. We analyze the Accumulation-Manipulation-Distribution (AMD) cycle to enter trades after retail traders have been stopped out."
                  />
                </div>

                <section className="bg-gold/5 border border-gold/20 rounded-3xl p-10 space-y-6">
                  <div className="flex items-center gap-3 text-gold">
                    <Info className="w-6 h-6" />
                    <h3 className="text-xl font-serif font-bold italic">Macro Grounding</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    Technical analysis alone is incomplete. VertexChart uses Google Search grounding to incorporate 
                    real-time economic data (NFP, CPI, FOMC) and central bank sentiment into every analysis. 
                    This ensures your technical setup aligns with the fundamental narrative of the market.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-4">
                    {['Interest Rates', 'Inflation Data', 'Geopolitical Risk', 'Yield Curves'].map(tag => (
                      <span key={tag} className="px-4 py-2 bg-gold/5 rounded-full text-[11px] font-serif italic text-gold border border-gold/10 uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="md:pl-20 border-t border-alchemist-border py-8 md:py-12 bg-alchemist-card/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-lg font-serif font-bold italic text-white">VertexChart</h2>
              <p className="text-[8px] md:text-[10px] font-serif italic text-gray-700 uppercase tracking-[0.3em]">
                © 2026 PRIVATE ANALYTICAL SUITE // ALL RIGHTS RESERVED
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              <FooterLink label="Archives" />
              <FooterLink label="Methodology" />
              <FooterLink label="Terms of Service" />
            </div>

            <div className="flex items-center gap-4 text-[8px] md:text-[10px] font-serif italic text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-900 opacity-50" />
                <span>REPOSITORY ONLINE</span>
              </div>
              <span>v2.4.0-REFINED</span>
            </div>
        </div>
      </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactElement, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 group transition-all relative",
        active ? "text-gold" : "text-gray-600 hover:text-gray-400"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute -inset-6 bg-gold/5 blur-2xl rounded-full"
        />
      )}
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
        active ? "bg-gold/5 border-gold/20 shadow-2xl shadow-gold/5" : "bg-transparent border-transparent"
      )}>
        {React.cloneElement(icon, { className: "w-6 h-6" } as any)}
      </div>
      <span className="text-[10px] font-serif italic uppercase tracking-[0.2em] font-medium">{label}</span>
    </button>
  );
}

function SignalMetric({ label, value, color }: { label: string, value: string, color: 'white' | 'emerald' | 'red' }) {
  const colorClasses = {
    white: "text-white",
    emerald: "text-emerald-400",
    red: "text-red-400"
  };

  return (
    <div className="space-y-1 md:space-y-2 p-4 md:p-6 bg-white/[0.02] rounded-[2rem] border border-white/5">
      <p className="text-[9px] md:text-[11px] font-serif italic text-gray-500 uppercase tracking-widest">{label}</p>
      <p className={cn("text-xl md:text-3xl font-serif font-bold tracking-tight", colorClasses[color])}>{value}</p>
    </div>
  );
}

function TechCard({ title, icon, content }: { title: string, icon: React.ReactElement, content: string }) {
  return (
    <div className="bg-alchemist-card border border-white/5 rounded-[2rem] p-8 space-y-6 hover:border-gold/20 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-gold/10 transition-all" />
      <div className="flex items-center gap-4 text-gold">
        <div className="w-10 h-10 bg-gold/5 rounded-xl flex items-center justify-center border border-gold/10 group-hover:scale-110 transition-transform">
          {React.cloneElement(icon, { className: "w-5 h-5" } as any)}
        </div>
        <h4 className="text-xs font-serif italic font-bold uppercase tracking-[0.2em]">{title}</h4>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed relative z-10 font-serif italic">{content}</p>
    </div>
  );
}

function MethodCard({ title, icon, description }: { title: string, icon: React.ReactElement, description: string }) {
  return (
    <div className="bg-alchemist-card border border-white/5 rounded-[2.5rem] p-8 md:p-12 space-y-6 md:space-y-8 hover:border-gold/20 transition-all group relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/5 blur-3xl rounded-full -ml-24 -mb-24 group-hover:bg-gold/10 transition-all" />
      <div className="w-14 h-14 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform relative z-10">
        {React.cloneElement(icon, { className: "w-7 h-7 md:w-8 md:h-8 text-gold" } as any)}
      </div>
      <div className="space-y-3 md:space-y-4 relative z-10">
        <h3 className="text-xl md:text-2xl font-serif font-bold italic text-white">{title}</h3>
        <p className="text-sm md:text-base text-gray-400 leading-relaxed font-serif italic">{description}</p>
      </div>
    </div>
  );
}

function FeatureStep({ icon, label }: { icon: React.ReactElement, label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-gray-600">
        {React.cloneElement(icon, { className: "w-5 h-5" } as any)}
      </div>
      <span className="text-[9px] font-serif italic text-gray-700 uppercase tracking-widest font-bold">{label}</span>
    </div>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <a href="#" className="text-[11px] font-serif italic text-gray-500 hover:text-gold transition-colors uppercase tracking-widest">
      {label}
    </a>
  );
}
