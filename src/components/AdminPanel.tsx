import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Lock, 
  KeyRound, 
  Save, 
  X, 
  ArrowLeft, 
  Percent, 
  Sparkles, 
  Database,
  CloudLightning,
  AlertTriangle,
  Info,
  Upload,
  Image,
  Video
} from 'lucide-react';
import { Product } from '../types';
import { supabase } from '../supabaseClient';

interface AdminPanelProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<boolean>;
  onUpdateProduct: (product: Product) => Promise<boolean>;
  onDeleteProduct: (productId: string) => Promise<boolean>;
  onClose: () => void;
  isSupabaseConnected: boolean;
  dbError?: string | null;
}

export default function AdminPanel({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onClose,
  isSupabaseConnected,
  dbError
}: AdminPanelProps) {
  // Passcode authentication & Security controls
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('elegantsmocking_admin_auth') === 'true';
  });
  const [loginError, setLoginError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return Number(localStorage.getItem('elegantsmocking_failed_attempts') || '0');
  });
  const [lockoutTime, setLockoutTime] = useState<number | null>(() => {
    const until = localStorage.getItem('elegantsmocking_lockout_until');
    if (until) {
      const untilNum = Number(until);
      if (untilNum > Date.now()) {
        return untilNum;
      }
    }
    return null;
  });
  const [remainingLockoutSeconds, setRemainingLockoutSeconds] = useState(0);

  // Inactivity session timer (15 minutes)
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Password change state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [currentPasscodeConfirm, setCurrentPasscodeConfirm] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmNewPasscode, setConfirmNewPasscode] = useState('');
  const [passcodeChangeError, setPasscodeChangeError] = useState<string | null>(null);
  const [passcodeChangeSuccess, setPasscodeChangeSuccess] = useState(false);

  // Lockout Countdown Effect
  React.useEffect(() => {
    if (!lockoutTime) return;

    const updateRemaining = () => {
      const now = Date.now();
      if (now >= lockoutTime) {
        setLockoutTime(null);
        localStorage.removeItem('elegantsmocking_lockout_until');
        setFailedAttempts(0);
        localStorage.setItem('elegantsmocking_failed_attempts', '0');
      } else {
        setRemainingLockoutSeconds(Math.ceil((lockoutTime - now) / 1000));
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  // Session Inactivity Tracking Effect
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const handleInteraction = () => {
      setLastActivity(Date.now());
    };

    // Listen to user activity to refresh last activity timestamp
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('scroll', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    // Periodic checker (every 10 seconds)
    const checkInterval = setInterval(() => {
      const fifteenMinutes = 15 * 60 * 1000;
      if (Date.now() - lastActivity > fifteenMinutes) {
        handleLogout();
        alert('La sessione amministratore è scaduta per inattività (15 minuti). Effettua nuovamente il login.');
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, lastActivity]);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  
  // Custom delete confirmation state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'weed' | 'hash'>('weed');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [cbd, setCbd] = useState<number>(20);
  const [thc, setThc] = useState<number>(0.4);
  const [aromaInput, setAromaInput] = useState('');
  const [price15, setPrice15] = useState<number>(12);
  const [price5, setPrice5] = useState<number>(35);
  const [price10, setPrice10] = useState<number>(60);
  const [imageUrl, setImageUrl] = useState('');
  const [badge, setBadge] = useState('');

  const getMasterPasscode = () => {
    return localStorage.getItem('elegantsmocking_custom_passcode') || 'elegantsmoking420!';
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Check if currently locked out
    if (lockoutTime && lockoutTime > Date.now()) {
      const secondsLeft = Math.ceil((lockoutTime - Date.now()) / 1000);
      setLoginError(`Troppi tentativi errati. Riprova tra ${secondsLeft} secondi.`);
      return;
    }

    const masterPasscode = getMasterPasscode();
    
    // Sanitize input
    const cleanPasscode = passcode.trim();

    if (cleanPasscode === masterPasscode) {
      setIsAuthenticated(true);
      localStorage.setItem('elegantsmocking_admin_auth', 'true');
      setLoginError('');
      setFailedAttempts(0);
      localStorage.setItem('elegantsmocking_failed_attempts', '0');
      setPasscode('');
      setLastActivity(Date.now()); // reset session timer
    } else {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      localStorage.setItem('elegantsmocking_failed_attempts', String(nextFailed));

      if (nextFailed >= 5) {
        const cooldownMs = 5 * 60 * 1000; // 5 minute lockout
        const lockoutUntil = Date.now() + cooldownMs;
        setLockoutTime(lockoutUntil);
        localStorage.setItem('elegantsmocking_lockout_until', String(lockoutUntil));
        setLoginError('Tentativi massimi superati. Accesso bloccato per 5 minuti.');
      } else {
        setLoginError(`Passcode errato. Rimangono ${5 - nextFailed} tentativi.`);
      }
      setPasscode('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('elegantsmocking_admin_auth');
    setPasscode('');
    // Clear custom login state
    setCurrentPasscodeConfirm('');
    setNewPasscode('');
    setConfirmNewPasscode('');
    setShowPasswordChangeModal(false);
    
    // Cleanly redirect out of the admin panel back to the public catalog
    onClose();
  };

  const handlePasscodeChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeChangeError(null);
    setPasscodeChangeSuccess(false);

    const masterPasscode = getMasterPasscode();

    if (currentPasscodeConfirm.trim() !== masterPasscode) {
      setPasscodeChangeError('La password attuale inserita non è corretta.');
      return;
    }

    if (newPasscode.length < 6) {
      setPasscodeChangeError('La nuova password deve essere lunga almeno 6 caratteri.');
      return;
    }

    if (newPasscode !== confirmNewPasscode) {
      setPasscodeChangeError('La nuova password e la conferma non corrispondono.');
      return;
    }

    // Save new passcode securely in local storage
    localStorage.setItem('elegantsmocking_custom_passcode', newPasscode.trim());
    setPasscodeChangeSuccess(true);
    setCurrentPasscodeConfirm('');
    setNewPasscode('');
    setConfirmNewPasscode('');

    setTimeout(() => {
      setPasscodeChangeSuccess(false);
      setShowPasswordChangeModal(false);
    }, 2000);
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setName('');
    setCategory('weed');
    setTagline('');
    setDescription('');
    setCbd(20);
    setThc(0.4);
    setAromaInput('');
    setPrice15(12);
    setPrice5(35);
    setPrice10(60);
    setImageUrl('');
    setBadge('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name || '');
    setCategory(prod.category || 'weed');
    setTagline(prod.tagline || '');
    setDescription(prod.description || '');
    setCbd(prod.cbd || 0);
    setThc(prod.thc || 0);
    setAromaInput(Array.isArray(prod.aroma) ? prod.aroma.join(', ') : '');
    setPrice15(prod.prices && prod.prices['1.5g'] !== undefined ? prod.prices['1.5g'] : 12);
    setPrice5(prod.prices && prod.prices['5g'] !== undefined ? prod.prices['5g'] : 35);
    setPrice10(prod.prices && prod.prices['10g'] !== undefined ? prod.prices['10g'] : 60);
    setImageUrl(prod.image || '');
    setBadge(prod.badge || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setFormError("Il file selezionato è troppo grande. Scegli un file inferiore a 50MB.");
      return;
    }

    setLastSelectedFile(file);
    setFormError(null);

    // Se Supabase è configurato e connesso, carichiamo direttamente nel Bucket di Storage!
    if (isSupabaseConnected && supabase) {
      setIsUploadingImage(true);
      try {
        const bucketName = (import.meta as any).env.VITE_SUPABASE_BUCKET || 'products';
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `product-media/${fileName}`;

        const { error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        setImageUrl(publicUrl);
        setFormError(null);
      } catch (err: any) {
        console.error("Supabase storage upload error:", err);
        setFormError(`Caricamento fallito su Supabase Storage (Bucket: "${(import.meta as any).env.VITE_SUPABASE_BUCKET || 'products'}"). Assicurati che il bucket esista e sia configurato con permessi pubblici e policy di upload attive. Errore: ${err.message || err}`);
      } finally {
        setIsUploadingImage(false);
      }
    } else {
      // Fallback per modalità demo locale (salva come base64 nel database locale)
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setFormError(null);
      };
      reader.onerror = () => {
        setFormError("Errore durante la lettura locale del file multimediale.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBase64Fallback = () => {
    if (!lastSelectedFile) {
      setFormError("Nessun file selezionato da convertire.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
      setFormError(null);
    };
    reader.onerror = () => {
      setFormError("Errore durante la conversione locale in Base64.");
    };
    reader.readAsDataURL(lastSelectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Per favore inserisci il nome del prodotto.');
      return;
    }
    if (!imageUrl.trim()) {
      setFormError('Per favore carica una foto del prodotto dal tuo telefono o computer.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const aromas = aromaInput
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const productPayload: Product = {
      id: editingProduct ? editingProduct.id : `${category}-${Date.now()}`,
      name: name.trim(),
      category,
      tagline: tagline.trim() || 'Aroma e Terpeni Intatti',
      description: description.trim(),
      cbd: Number(cbd) || 0,
      thc: Number(thc) || 0,
      aroma: aromas,
      prices: {
        '1.5g': Number(price15),
        '5g': Number(price5),
        '10g': Number(price10),
      },
      image: imageUrl.trim(),
      badge: badge.trim() || undefined,
    };

    try {
      let success = false;
      if (editingProduct) {
        success = await onUpdateProduct(productPayload);
      } else {
        success = await onAddProduct(productPayload);
      }

      if (success) {
        setFormSuccess(true);
        setTimeout(() => {
          setFormSuccess(false);
          setIsFormOpen(false);
        }, 1200);
      } else {
        setFormError('Impossibile salvare il prodotto. Controlla la connessione al database.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Errore imprevisto durante il salvataggio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const success = await onDeleteProduct(productToDelete.id);
      if (!success) {
        alert('Impossibile rimuovere il prodotto. Controlla la connessione al database.');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  // Login render
  if (!isAuthenticated) {
    const isLockedOut = lockoutTime !== null && lockoutTime > Date.now();
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1c0505] via-[#380c0c] to-[#6d1313] flex flex-col justify-center items-center p-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[300px] w-[300px] bg-rose-500/15 blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#220707] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
        >
          <div className="text-center mb-6">
            <div className={`h-12 w-12 rounded-2xl ${isLockedOut ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} border flex items-center justify-center mx-auto mb-3`}>
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest font-mono text-white">
              Area Riservata
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              ACCESSO RISERVATO AI SOLI AMMINISTRATORI
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1.5">
                Passcode Admin
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  placeholder={isLockedOut ? "Accesso temporaneamente bloccato..." : "Inserisci password..."}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  disabled={isLockedOut}
                  className={`w-full bg-slate-950 border ${isLockedOut ? 'border-amber-500/20 text-amber-500/60' : 'border-white/10 focus:border-white/20'} rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/20`}
                  autoFocus={!isLockedOut}
                />
              </div>
            </div>

            {loginError && (
              <div className={`p-3 border text-center text-xs font-mono rounded-xl leading-relaxed ${isLockedOut ? 'bg-amber-950/40 border-amber-500/30 text-amber-400' : 'bg-red-950/40 border-red-500/30 text-red-400'}`}>
                {loginError}
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-zinc-400 font-bold text-xs cursor-pointer transition-all"
              >
                Torna Indietro
              </button>
              <button
                type="submit"
                disabled={isLockedOut}
                className={`w-2/3 py-2.5 bg-gradient-to-r ${isLockedOut ? 'from-zinc-800 to-zinc-700 text-zinc-500 cursor-not-allowed' : 'from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white cursor-pointer'} font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all`}
              >
                {isLockedOut ? `Attendi (${remainingLockoutSeconds}s)` : "Entra nell'Area"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1c0505] via-[#380c0c] to-[#6d1313] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute top-0 right-1/4 h-[300px] w-[500px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

      {/* ADMIN SUBHEADER */}
      <div className="border-b border-white/[0.08] bg-[#1c0505]/60 sticky top-0 z-20 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                title="Torna al Catalogo Pubblico"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-sans font-black text-base text-white uppercase tracking-wider">
                    Pannello Gestione Elegant Smoking
                  </h2>
                  <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    Admin
                  </span>
                  {isSupabaseConnected ? (
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Supabase Connesso
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider flex items-center gap-1" title={dbError || "Nessuna chiave di Supabase nel file .env"}>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Demo Cache Locale
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500">
                  {isSupabaseConnected 
                    ? "Sincronizzato in tempo reale con il tuo database remoto Supabase" 
                    : "Catalogo locale temporaneo (i dati inseriti rimarranno salvati in questo browser)"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPasscodeChangeError(null);
                  setPasscodeChangeSuccess(false);
                  setCurrentPasscodeConfirm('');
                  setNewPasscode('');
                  setConfirmNewPasscode('');
                  setShowPasswordChangeModal(true);
                }}
                className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 hover:border-white/10 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5 text-rose-400" />
                <span>Sicurezza</span>
              </button>
              <button
                onClick={handleLogout}
                className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white mb-1">
                Elenchi Catalogo ({products.length})
              </h3>
              <p className="text-xs text-zinc-400">Tutti gli elementi attualmente configurati ed esposti.</p>
            </div>

            <button
              onClick={openAddForm}
              className="py-3 px-5 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4 stroke-[3px]" /> Aggiungi Prodotto
            </button>
          </div>

          {/* Simple Products Admin List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => {
              const isWeed = p.category === 'weed';
              return (
                <div 
                  key={p.id}
                  className={`bg-[#220707]/60 rounded-3xl border p-5 flex flex-col relative transition-all hover:bg-[#220707]/80 ${
                    isWeed ? 'border-rose-500/15' : 'border-red-500/15'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-16 h-16 rounded-2xl object-cover bg-slate-950 shrink-0 border border-white/5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                          isWeed 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500/20' 
                            : 'bg-red-950/40 text-red-300 border-red-500/20'
                        }`}>
                          {isWeed ? 'Weed' : 'Hash'}
                        </span>
                        {p.badge && (
                          <span className="text-[9px] uppercase font-bold bg-red-500/10 text-red-300 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-0.5">
                            <Sparkles className="h-2 w-2" /> {p.badge}
                          </span>
                        )}
                      </div>
                      <h4 className="font-sans font-bold text-sm text-white mt-2 truncate">{p.name}</h4>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{p.tagline}</p>
                    </div>
                  </div>

                  {/* Prices breakdown */}
                  <div className="grid grid-cols-3 gap-2 mt-5 p-2 bg-slate-950/65 rounded-xl border border-white/5 text-center">
                    <div>
                      <p className="text-[8px] font-mono uppercase text-zinc-600">1.5g</p>
                      <span className="text-xs font-bold text-white font-mono">€{p.prices['1.5g'].toFixed(2)}</span>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono uppercase text-zinc-600">5g</p>
                      <span className="text-xs font-bold text-white font-mono">€{p.prices['5g'].toFixed(2)}</span>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono uppercase text-zinc-600">10g</p>
                      <span className="text-xs font-bold text-white font-mono">€{p.prices['10g'].toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-white/5">
                    <button
                      onClick={() => openEditForm(p)}
                      className="p-2 bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 rounded-xl text-zinc-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Modifica
                    </button>
                    <button
                      onClick={() => setProductToDelete(p)}
                      className="p-2 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 border border-red-500/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>

      {/* FORM MODAL (ADD & EDIT) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-[#1c0505]/90 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#220707] border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#1c0505]/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase font-mono tracking-wider">
                      {editingProduct ? 'Modifica Varietà' : 'Nuova Varietà'}
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Definisci l'esposizione del prodotto</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                
                {formError && (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-200 rounded-xl font-medium flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-sans font-bold block mb-1">Errore Riscontrato:</span>
                        <p className="text-zinc-300 leading-relaxed font-mono text-[11px] break-words">{formError}</p>
                      </div>
                    </div>

                    {/* Guida RLS di Supabase Storage se l'errore riguarda le policy di Row Level Security */}
                    {(formError.toLowerCase().includes('row-level security') || 
                      formError.toLowerCase().includes('rls') || 
                      formError.toLowerCase().includes('security policy')) && (
                      <div className="p-4 bg-slate-950/90 border border-amber-500/20 text-zinc-300 rounded-xl text-[11px] space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2 text-amber-400 font-bold uppercase font-mono tracking-wider text-[10px]">
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                          <span>Risoluzione Rapida: Configura il tuo Bucket Supabase</span>
                        </div>
                        
                        <p className="leading-relaxed">
                          Il tuo database Supabase ha rifiutato il caricamento dell'immagine perché la tabella <code className="bg-white/5 px-1 py-0.5 rounded text-white font-mono">storage.objects</code> ha la Row-Level Security (RLS) attiva senza le policy necessarie per l'upload pubblico.
                        </p>

                        <div className="space-y-2">
                          <p className="font-bold text-white">Opzione A (Consigliata - Via SQL Editor di Supabase):</p>
                          <p className="text-zinc-400">
                            Copia e incolla questo script nel tuo **SQL Editor** su Supabase per creare le regole d'accesso in 2 secondi:
                          </p>
                          <pre className="p-3 bg-black/60 rounded-lg border border-white/5 font-mono text-[10px] text-emerald-400 overflow-x-auto select-all leading-normal whitespace-pre">
{`-- 1. Permetti l'inserimento pubblico nel tuo bucket "${(import.meta as any).env.VITE_SUPABASE_BUCKET || 'products'}"
CREATE POLICY "Consenti upload pubblico" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = '${(import.meta as any).env.VITE_SUPABASE_BUCKET || 'products'}');

-- 2. Permetti l'accesso pubblico in lettura
CREATE POLICY "Consenti lettura pubblica" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = '${(import.meta as any).env.VITE_SUPABASE_BUCKET || 'products'}');`}
                          </pre>
                        </div>

                        <div className="space-y-1 pb-2">
                          <p className="font-bold text-white">Opzione B (Via Interfaccia Web di Supabase):</p>
                          <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                            <li>Vai nella dashboard di Supabase ➔ **Storage** ➔ **Buckets**.</li>
                            <li>Assicurati che il tuo bucket <strong className="text-white">"${(import.meta as any).env.VITE_SUPABASE_BUCKET || 'products'}"</strong> sia impostato su <strong className="text-white">Public</strong>.</li>
                            <li>Clicca su **Policies** nella barra laterale di sinistra.</li>
                            <li>Trova il bucket <strong className="text-white">"${(import.meta as any).env.VITE_SUPABASE_BUCKET || 'products'}"</strong> e clicca su **New Policy**.</li>
                            <li>Crea una policy personalizzata con permessi di <strong className="text-white">INSERT</strong> e <strong className="text-white">SELECT</strong> per utenti non autenticati (ANON / PUBLIC).</li>
                          </ul>
                        </div>

                        <div className="pt-3 border-t border-amber-500/20 space-y-2">
                          <p className="font-bold text-amber-300">Opzione C (Risoluzione Istantanea - Bypass Storage):</p>
                          <p className="text-zinc-450 leading-relaxed text-[10px]">
                            Se non vuoi configurare le policy di Supabase adesso, puoi convertire questa immagine in formato locale Base64. Verrà salvata direttamente nel database dei prodotti e visualizzata istantaneamente!
                          </p>
                          <button
                            type="button"
                            onClick={handleBase64Fallback}
                            className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-black uppercase tracking-wider text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/20 active:scale-[0.98]"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-slate-950" />
                            Usa Codifica Locale Base64 e procedi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 rounded-xl font-medium flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Salvato con successo! Sincronizzazione in corso...</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1">
                      Nome Prodotto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="es. Amnesia Haze, Super Skunk..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 focus:border-white/20 rounded-xl p-3 text-white placeholder-zinc-650 font-sans focus:outline-none focus:ring-1 focus:ring-rose-500/15"
                    />
                  </div>

                  {/* Category Selection */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1">
                      Tipologia Botanica *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/5 focus:border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-rose-500/15"
                    >
                      <option value="weed">Weed 🌿</option>
                      <option value="hash">Hash 🍫</option>
                    </select>
                  </div>

                  {/* Badge */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1">
                      Badge / Offerta Specifica (Opzionale)
                    </label>
                    <input
                      type="text"
                      placeholder="es. Sconto 20%, Novità, Top Seller..."
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 focus:border-white/20 rounded-xl p-3 text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-rose-500/15"
                    />
                  </div>

                  {/* Foto o Video Prodotto (Device Upload Picker) */}
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">
                      Foto o Video Prodotto *
                    </label>
                    
                    <div className="relative">
                      <input
                        id="product-photo-upload"
                        type="file"
                        accept="image/*,video/*"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                      
                      {isUploadingImage ? (
                        <div className="flex flex-col items-center justify-center h-44 w-full border border-rose-500/30 bg-slate-950/60 rounded-2xl animate-pulse p-4">
                          <div className="h-8 w-8 rounded-full border-2 border-t-rose-500 border-rose-500/20 animate-spin mb-3" />
                          <span className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">Caricamento File...</span>
                          <span className="text-[10px] text-zinc-500 mt-1 text-center">
                            Salvataggio del file multimediale nel tuo bucket di storage Supabase
                          </span>
                        </div>
                      ) : imageUrl ? (
                        <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-slate-950 p-2 flex flex-col items-center">
                          {imageUrl.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v|avi)(?:\?|$)/i.test(imageUrl) ? (
                            <video 
                              src={imageUrl} 
                              controls
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="h-44 w-full object-cover rounded-xl"
                            />
                          ) : (
                            <img 
                              src={imageUrl} 
                              alt="Preview prodotto" 
                              className="h-44 w-full object-cover rounded-xl"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <label 
                              htmlFor="product-photo-upload" 
                              className="px-4 py-2 bg-white text-slate-950 font-mono font-bold text-[11px] rounded-xl cursor-pointer hover:bg-rose-100 transition-all shadow-md flex items-center gap-1.5 animate-none"
                            >
                              <Upload className="h-3 w-3" />
                              Cambia File
                            </label>
                            <button
                              type="button"
                              onClick={() => setImageUrl('')}
                              className="px-4 py-2 bg-red-600/90 text-white font-mono font-bold text-[11px] rounded-xl cursor-pointer hover:bg-red-500 transition-all shadow-md flex items-center gap-1.5"
                            >
                              <X className="h-3 w-3" />
                              Rimuovi
                            </button>
                          </div>
                          <div className="w-full mt-2 flex justify-between items-center px-1">
                            <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                              {imageUrl.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v|avi)(?:\?|$)/i.test(imageUrl) ? (
                                <>
                                  <Video className="h-3 w-3 text-rose-400" />
                                  Video caricato correttamente
                                </>
                              ) : (
                                <>
                                  <Image className="h-3 w-3 text-rose-400" />
                                  Foto caricata correttamente
                                </>
                              )}
                            </span>
                            <div className="flex gap-2">
                              <label 
                                htmlFor="product-photo-upload" 
                                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold font-mono cursor-pointer underline decoration-dotted"
                              >
                                Sostituisci
                              </label>
                              <button 
                                type="button"
                                onClick={() => setImageUrl('')}
                                className="text-[10px] text-zinc-500 hover:text-red-400 font-bold font-mono cursor-pointer"
                              >
                                Rimuovi
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="product-photo-upload"
                          className="flex flex-col items-center justify-center h-36 w-full border-2 border-dashed border-white/10 hover:border-rose-500/40 bg-slate-950/40 hover:bg-rose-500/[0.02] rounded-2xl cursor-pointer transition-all duration-200 group animate-none"
                        >
                          <div className="p-3 bg-white/5 group-hover:bg-rose-500/10 border border-white/5 group-hover:border-rose-500/20 rounded-2xl mb-2.5 transition-all">
                            <Upload className="h-5 w-5 text-zinc-400 group-hover:text-rose-400 transition-colors" />
                          </div>
                          <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">
                            Carica foto o video da dispositivo
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-1">
                            Seleziona galleria o file dal telefono/PC (fino a 50MB)
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="col-span-2 pt-2 border-t border-white/5">
                    <h5 className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-3">Prezzi per quantitativo (Euro)</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] uppercase font-mono text-zinc-600 mb-1">1.5 grammi</label>
                        <input
                          type="number"
                          step="0.05"
                          value={price15}
                          onChange={(e) => setPrice15(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/5 focus:border-white/20 rounded-xl p-3 text-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500/15"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-mono text-zinc-600 mb-1">5 grammi</label>
                        <input
                          type="number"
                          step="0.05"
                          value={price5}
                          onChange={(e) => setPrice5(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/5 focus:border-white/20 rounded-xl p-3 text-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500/15"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-mono text-zinc-600 mb-1">10 grammi</label>
                        <input
                          type="number"
                          step="0.05"
                          value={price10}
                          onChange={(e) => setPrice10(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/5 focus:border-white/20 rounded-xl p-3 text-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500/15"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-white/5 hover:bg-white/5 text-zinc-400 font-bold transition-all cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingImage}
                    className="py-2.5 px-5 bg-gradient-to-b from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-red-950/20"
                  >
                    <Save className="h-4 w-4" /> 
                    <span>{isSubmitting ? 'Salvataggio...' : isUploadingImage ? 'Attendi caricamento foto...' : 'Salva Prodotto'}</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}

        {/* CUSTOM DELETE CONFIRMATION MODAL */}
        {productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-[#1c0505]/95 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#220707] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden z-10 text-center"
            >
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">
                Elimina Prodotto?
              </h3>
              
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Sei sicuro di voler rimuovere definitivamente <span className="text-white font-bold">"{productToDelete.name}"</span>? Questa azione è irreversibile.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-zinc-400 hover:text-white font-bold transition-all text-xs"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-950/20 text-xs"
                >
                  {isDeleting ? 'Eliminazione...' : 'Elimina'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CUSTOM CHANGE PASSCODE MODAL */}
        {showPasswordChangeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordChangeModal(false)}
              className="absolute inset-0 bg-[#1c0505]/95 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#220707] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden z-10"
            >
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="h-6 w-6" />
              </div>
              
              <h3 className="text-base font-black text-white text-center uppercase tracking-wider mb-1 font-sans">
                Sicurezza & Passcode
              </h3>
              <p className="text-[10px] text-zinc-500 text-center font-mono uppercase tracking-wider mb-5">
                Cambia password di accesso amministratore
              </p>

              <form onSubmit={handlePasscodeChangeSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[9px] uppercase font-mono tracking-widest text-zinc-400 mb-1">
                    Password Attuale
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPasscodeConfirm}
                    onChange={(e) => setCurrentPasscodeConfirm(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-white/20 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono tracking-widest text-zinc-400 mb-1">
                    Nuova Password (min. 6 car.)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nuova password"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-white/20 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono tracking-widest text-zinc-400 mb-1">
                    Conferma Nuova Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Ripeti nuova password"
                    value={confirmNewPasscode}
                    onChange={(e) => setConfirmNewPasscode(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-white/20 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none"
                  />
                </div>

                {passcodeChangeError && (
                  <div className="p-2 border border-red-500/20 bg-red-950/40 text-red-400 text-[10px] font-mono rounded-lg text-center leading-normal">
                    {passcodeChangeError}
                  </div>
                )}

                {passcodeChangeSuccess && (
                  <div className="p-2 border border-emerald-500/20 bg-emerald-950/40 text-emerald-400 text-[10px] font-mono rounded-lg text-center leading-normal">
                    ✓ Password modificata con successo!
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordChangeModal(false)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-zinc-400 hover:text-white font-bold transition-all text-[11px]"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg text-[11px]"
                  >
                    Aggiorna
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
