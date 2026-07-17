import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Instagram } from 'lucide-react';
import { motion } from 'motion/react';

import { Product, Category } from './types';
import AgeVerification from './components/AgeVerification';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import AdminPanel from './components/AdminPanel';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import bannerImg from '../BANNER.png';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'weed', label: 'Weed', emoji: '🌿' },
  { id: 'hash', label: 'Hash', emoji: '🍫' }
];

export default function App() {
  const [activeSection, setActiveSection] = useState('catalog');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('elegantsmocking_admin_auth') === 'true';
  });

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => {
    const stored = localStorage.getItem('elegantsmoking_categories');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_CATEGORIES;
  });
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
            category: String(item.category || 'weed'),
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

          // Remove potential duplicate product IDs to prevent React key collision warnings
          const uniqueParsed: Product[] = [];
          const seenIds = new Set<string>();
          for (const prod of parsed) {
            if (prod.id && !seenIds.has(prod.id)) {
              seenIds.add(prod.id);
              uniqueParsed.push(prod);
            }
          }

          setProducts(uniqueParsed);
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

  // Fetch live categories from Supabase (or fallback to local)
  useEffect(() => {
    async function fetchCategories() {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          const parsed: Category[] = data.map((item: any) => ({
            id: item.id,
            label: item.label,
            emoji: item.emoji
          }));
          setCategories(parsed);
          localStorage.setItem('elegantsmoking_categories', JSON.stringify(parsed));
        }
      } catch (err) {
        console.warn('Tabella categories non trovata o non accessibile in Supabase, si usa il localStorage.', err);
      }
    }
    fetchCategories();
  }, [useLiveDb]);

  // Handler for adding dynamic category
  const handleAddCategory = async (newCat: Category): Promise<boolean> => {
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('elegantsmoking_categories', JSON.stringify(updated));

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('categories')
          .insert([
            {
              id: newCat.id,
              label: newCat.label,
              emoji: newCat.emoji
            }
          ]);
        if (error) {
          console.warn('Errore durante il salvataggio remoto della categoria (forse la tabella non esiste):', error.message);
        }
      } catch (err) {
        console.warn('Errore Supabase categories:', err);
      }
    }
    return true;
  };

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
        categories={categories}
        onAddCategory={handleAddCategory}
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_#0F0A14_0%,_#000000_100%)] text-slate-100 font-sans selection:bg-rose-500/20 selection:text-rose-300 relative overflow-x-hidden animate-fade-in">
      
      {/* 18+ AGE VERIFICATION SCREEN */}
      <AgeVerification />

      {/* LIGHT DECORATIVE AMBIENCE */}
      <div className="absolute top-0 left-1/4 h-[300px] w-[500px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[50%] right-[-10%] h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />

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

      {/* SPECTACULAR PREMIUM CINEMATIC BILLBOARD */}
      <header className="relative pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-slate-950 min-h-[200px] sm:min-h-[340px] md:min-h-[460px] lg:min-h-[520px] flex items-center bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${bannerImg})` 
          }}
        >
          {/* Subtle elegant vignette shadow overlay around the edges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
          
          {/* Ambient lighting borders */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-60 pointer-events-none" />
        </div>
      </header>

      {/* CORE CATALOG WITH THE TWO FILTERS */}
      <main id="catalog" className="py-8 pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-10 border-b border-white/[0.06] mb-12">
            
            {/* Category selection */}
            <div className="flex flex-wrap gap-1 bg-slate-900/80 border border-white/10 rounded-2xl p-1.5 shrink-0 shadow-xl">
              {[
                { id: 'all', label: 'Tutti i Prodotti', emoji: '' },
                ...categories
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-b from-white/15 to-white/5 border border-white/10 text-white shadow-lg'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>{cat.label}</span>
                  {cat.emoji && <span className="text-sm">{cat.emoji}</span>}
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
                {filteredProducts.map((product, idx) => (
                  <ProductCard 
                    key={`${product.id}-${idx}`} 
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
