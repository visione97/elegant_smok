import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Instagram } from 'lucide-react';
import { motion } from 'motion/react';

import { Product } from './types';
import AgeVerification from './components/AgeVerification';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import AdminPanel from './components/AdminPanel';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export default function App() {
  const [activeSection, setActiveSection] = useState('catalog');
  const [activeCategory, setActiveCategory] = useState<'all' | 'weed' | 'hash'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('elegantsmocking_admin_auth') === 'true';
  });

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [useLiveDb, setUseLiveDb] = useState(isSupabaseConfigured);
  const [dbError, setDbError] = useState<string | null>(null);

  // 1. Fetch live products from Supabase
  useEffect(() => {
    async function fetchProducts() {
      if (!isSupabaseConfigured || !supabase) {
        setDbError("Supabase non è configurato. Configura le chiavi di connessione per abilitare il catalogo.");
        return;
      }
      setDbLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*');
        
        if (error) {
          throw error;
        }

        if (data) {
          const parsed: Product[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category as 'weed' | 'hash',
            tagline: item.tagline || 'Aroma e Terpeni Intatti',
            description: item.description || '',
            cbd: Number(item.cbd) || 0,
            thc: Number(item.thc) || 0,
            aroma: Array.isArray(item.aroma) ? item.aroma : [],
            prices: typeof item.prices === 'object' && item.prices !== null ? item.prices : {
              '1.5g': 12,
              '5g': 35,
              '10g': 60
            },
            image: item.image,
            badge: item.badge || undefined
          }));
          setProducts(parsed);
          setUseLiveDb(true);
          setDbError(null);
        }
      } catch (err: any) {
        console.error('Errore durante il caricamento del catalogo remoto:', err?.message || err);
        setUseLiveDb(false);
        setDbError(err.message || String(err));
      } finally {
        setDbLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // 2. Database Insertion (Create)
  const handleAddProduct = async (newProduct: Product): Promise<boolean> => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('products')
          .insert([
            {
              id: newProduct.id,
              name: newProduct.name,
              category: newProduct.category,
              tagline: newProduct.tagline,
              description: newProduct.description,
              cbd: newProduct.cbd,
              thc: newProduct.thc,
              aroma: newProduct.aroma,
              prices: newProduct.prices,
              image: newProduct.image,
              badge: newProduct.badge
            }
          ]);
        
        if (error) throw error;
        setProducts((prev) => [newProduct, ...prev]);
        return true;
      } catch (err) {
        console.error('Errore inserimento prodotto:', err);
        return false;
      }
    }
    return false;
  };

  // 3. Database Update (Edit Detail or Badges / Offers)
  const handleUpdateProduct = async (updatedProduct: Product): Promise<boolean> => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('products')
          .update({
            name: updatedProduct.name,
            category: updatedProduct.category,
            tagline: updatedProduct.tagline,
            description: updatedProduct.description,
            cbd: updatedProduct.cbd,
            thc: updatedProduct.thc,
            aroma: updatedProduct.aroma,
            prices: updatedProduct.prices,
            image: updatedProduct.image,
            badge: updatedProduct.badge
          })
          .eq('id', updatedProduct.id);

        if (error) throw error;
        setProducts((prev) =>
          prev.map((item) => (item.id === updatedProduct.id ? updatedProduct : item))
        );
        return true;
      } catch (err) {
        console.error('Errore aggiornamento prodotto:', err);
        return false;
      }
    }
    return false;
  };

  // 4. Database Deletion (Remove)
  const handleDeleteProduct = async (productId: string): Promise<boolean> => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);

        if (error) throw error;
        setProducts((prev) => prev.filter((item) => item.id !== productId));
        return true;
      } catch (err) {
        console.error('Errore rimozione prodotto:', err);
        return false;
      }
    }
    return false;
  };

  // Filter products based on search and category
  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.aroma.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleNavClick = (sectionId: string) => {
    setIsAdminMode(false);
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // If AdminMode is active, mount the beautiful Admin Panel directly on screen
  if (isAdminMode) {
    return (
      <AdminPanel
        products={products}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onClose={() => {
          setIsAdminMode(false);
          setActiveSection('catalog');
          setIsAdminAuthenticated(localStorage.getItem('elegantsmocking_admin_auth') === 'true');
        }}
        isSupabaseConnected={useLiveDb && supabase !== null}
        dbError={dbError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1c0505] via-[#380c0c] to-[#6d1313] text-slate-100 font-sans selection:bg-rose-500/20 selection:text-rose-300 relative overflow-x-hidden animate-fade-in">
      
      {/* 18+ AGE VERIFICATION SCREEN */}
      <AgeVerification />

      {/* LIGHT DECORATIVE AMBIENCE */}
      <div className="absolute top-0 left-1/4 h-[300px] w-[500px] rounded-full bg-rose-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[50%] right-[-10%] h-[400px] w-[400px] rounded-full bg-red-500/10 blur-[150px] pointer-events-none" />

      {/* MAIN TOP NAVIGATION - NOW INCLUDES SECURE PORTAL BUTTON */}
      <Navbar 
        onNavClick={handleNavClick} 
        activeSection={activeSection} 
        isAdminMode={isAdminAuthenticated}
        onAdminClick={() => setIsAdminMode(true)}
      />

      {/* FLOATING ACTION BANNER FOR ACTIVE ADMIN SESSION */}
      {isAdminAuthenticated && (
        <div className="bg-[#1c0505] border-b border-rose-500/20 text-xs py-2.5 px-4 sticky top-16 z-30 flex flex-col sm:flex-row justify-between items-center gap-2.5 shadow-lg shadow-rose-950/20 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2.5 font-mono">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-rose-400 font-bold uppercase tracking-wider text-[11px]">Sessione Amministratore Attiva:</span>
            <span className="text-zinc-300">Sei autenticato.</span>
            
            {useLiveDb && supabase ? (
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Supabase Online
              </span>
            ) : (
              <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" title={dbError || "Nessuna chiave di Supabase inserita nel file .env"}>
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                Errore Connessione Supabase
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdminMode(true)}
              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
            >
              Apri Pannello Admin
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('elegantsmocking_admin_auth');
                setIsAdminAuthenticated(false);
                setIsAdminMode(false);
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
            >
              Termina Sessione (Logout)
            </button>
          </div>
        </div>
      )}

      {/* SPECTACULAR URBAN GRAFFITI MURAL BILLBOARD */}
      <header className="relative pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-slate-950 min-h-[360px] md:min-h-[440px] flex items-center justify-center p-6 md:p-12">
          
          {/* Dark textured brick wall background mimicking the user's uploaded art */}
          <div 
            className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-40 select-none pointer-events-none"
            style={{ 
              backgroundImage: 'url("https://images.unsplash.com/photo-1524055988636-436cfa46e59e?auto=format&fit=crop&q=80&w=1600")' 
            }}
          />
          
          {/* Graffiti colorful glow backdrop */}
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-950/50 via-purple-900/30 to-red-950/50 opacity-90 pointer-events-none" />
          
          {/* Vibrant spray paint neon halos in rose, purple, and gold */}
          <div className="absolute top-1/4 left-1/4 h-[200px] w-[200px] rounded-full bg-rose-500/20 blur-[70px] pointer-events-none animate-pulse duration-[4000ms]" />
          <div className="absolute bottom-1/4 right-1/4 h-[240px] w-[240px] rounded-full bg-purple-500/20 blur-[90px] pointer-events-none animate-pulse duration-[6000ms]" />
          <div className="absolute top-1/3 right-1/3 h-[180px] w-[180px] rounded-full bg-amber-500/15 blur-[60px] pointer-events-none" />
          
          {/* Soft cloud vectors mimicking the graffiti smoke trails in the mural */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -left-12 bottom-12 text-white/5 animate-pulse duration-[8000ms]">
              <svg className="h-44 w-44" viewBox="0 0 100 100" fill="currentColor">
                <path d="M20,50 Q30,35 50,45 T80,50 Q90,65 70,75 T30,70 Z" />
              </svg>
            </div>
            <div className="absolute -right-12 top-12 text-white/5 animate-pulse duration-[7000ms]">
              <svg className="h-52 w-52" viewBox="0 0 100 100" fill="currentColor">
                <path d="M20,50 Q30,35 50,45 T80,50 Q90,65 70,75 T30,70 Z" />
              </svg>
            </div>
          </div>

          {/* Main graffiti billboard contents */}
          <div className="relative z-10 text-center max-w-3xl flex flex-col items-center">
            
            {/* Flanking yellow stars matching the star graphics from the uploaded graffiti */}
            <div className="flex gap-4 mb-4 items-center justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
              >
                <Sparkles className="h-5 w-5 stroke-[2.5]" />
              </motion.div>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-black/50 text-rose-300 text-[10px] font-black tracking-widest uppercase backdrop-blur-md">
                <Sparkles className="h-3 w-3 animate-pulse" /> Archivio Selezionato
              </div>

              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
              >
                <Sparkles className="h-4 w-4 stroke-[2.5]" />
              </motion.div>
            </div>

            {/* GRAFFITI TEXT WITH 3D POP & CHROMATIC SHADOWS */}
            <div className="relative select-none my-6">
              {/* Retro extrusion layer (Purple) */}
              <h1 className="font-marker text-5xl sm:text-7xl md:text-8xl text-purple-950 absolute top-1.5 left-1.5 w-full text-center select-none tracking-wide uppercase opacity-95">
                ELEGANT SMOKING
              </h1>
              {/* Secondary offset shadow layer (Vibrant Coral Red) */}
              <h1 className="font-marker text-5xl sm:text-7xl md:text-8xl text-red-900 absolute -top-1 -left-1 w-full text-center select-none tracking-wide uppercase opacity-80">
                ELEGANT SMOKING
              </h1>
              {/* Main front glowing graffiti letters with a multi-colored gradient */}
              <h1 className="font-marker text-5xl sm:text-7xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-rose-400 to-purple-400 tracking-wide uppercase drop-shadow-[0_6px_20px_rgba(244,63,94,0.5)] transform hover:scale-[1.02] transition-transform duration-300 cursor-default">
                ELEGANT SMOKING
              </h1>
            </div>

          </div>
          
          {/* Aesthetic paint drippings along the bottom border */}
          <div className="absolute bottom-0 left-0 right-0 h-2 flex justify-around opacity-50 pointer-events-none">
            <div className="w-1.5 h-6 bg-yellow-400 rounded-b-full" />
            <div className="w-1.5 h-10 bg-rose-500 rounded-b-full" />
            <div className="w-1.5 h-4 bg-purple-500 rounded-b-full" />
            <div className="w-1.5 h-8 bg-red-600 rounded-b-full" />
            <div className="w-1.5 h-5 bg-rose-400 rounded-b-full" />
          </div>

        </div>
      </header>

      {/* CORE CATALOG WITH THE TWO FILTERS */}
      <main id="catalog" className="py-8 pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-10 border-b border-white/[0.06] mb-12">
            
            {/* Category selection */}
            <div className="flex bg-slate-900/80 border border-white/10 rounded-2xl p-1.5 shrink-0 shadow-xl">
              {[
                { id: 'all', label: 'Tutti i Prodotti' },
                { id: 'weed', label: 'Weed 🌿' },
                { id: 'hash', label: 'Hash 🍫' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-b from-white/15 to-white/5 border border-white/10 text-white shadow-lg'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

          </div>

          {/* Dynamic Loading indicator if Supabase is actively fetching */}
          {dbLoading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-400 mb-4" />
              <p className="text-zinc-500 text-xs font-mono">Aggiornamento della galleria in corso...</p>
            </div>
          )}

          {/* Clean product gallery */}
          {!dbLoading && filteredProducts.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-zinc-500 text-xs font-mono">Nessun elemento corrisponde alla ricerca.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="mt-3 text-xs text-rose-400 underline hover:text-rose-300 cursor-pointer"
              >
                Azzera i filtri
              </button>
            </div>
          ) : (
            !dbLoading && (
              <div id="minimal-products-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                  />
                ))}
              </div>
            )
          )}

          {/* INSTAGRAM BANNER CARD */}
          <div className="mt-16 max-w-xl mx-auto">
            <a 
              href="https://www.instagram.com/elegantsmoking01" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block relative rounded-3xl border border-white/10 bg-slate-900/40 p-8 text-center overflow-hidden transition-all duration-300 hover:border-rose-500/30 hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]"
            >
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-red-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-white/10 text-white flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                  <Instagram className="h-6 w-6 text-rose-400 group-hover:text-white" />
                </div>
                
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-400 font-bold mb-1">
                  Seguici su Instagram
                </span>
                <h3 className="text-xl font-bold text-white mb-2 font-sans tracking-tight">
                  @elegantsmoking01
                </h3>

                
                <span className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 text-xs text-white font-bold tracking-wide transition-all group-hover:bg-rose-500 group-hover:text-slate-950 group-hover:border-rose-400">
                  Visita il Profilo
                </span>
              </div>
            </a>
          </div>

        </div>
      </main>

      {/* ULTRA CONCISE MINIMAL CLASSIFIED FOOTER */}
      <footer className="border-t border-white/[0.05] bg-slate-950 py-12 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <span className="font-bold text-white text-xs tracking-widest uppercase font-mono">ELEGANT SMOKING</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
