import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Check, X } from 'lucide-react';

export default function AgeVerification() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const isVerified = localStorage.getItem('growshop_age_verified');
    if (!isVerified) {
      setIsOpen(true);
    }
  }, []);

  const handleVerify = (accept: boolean) => {
    if (accept) {
      localStorage.setItem('growshop_age_verified', 'true');
      setIsOpen(false);
    } else {
      window.location.href = 'https://www.google.com';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="age-verification-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        >
          <motion.div
            id="age-verification-modal"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 150 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center text-white shadow-2xl backdrop-blur-2xl relative"
          >
            {/* Elegant glass orb decorative glow */}
            <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <ShieldAlert className="h-10 w-10 animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-2 font-sans bg-gradient-to-r from-white via-zinc-200 to-rose-300 bg-clip-text text-transparent">
              Accesso Vietato ai Minori
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              Questo sito offre prodotti a base di CBD ed è riservato esclusivamente a un pubblico maggiorenne (+18 anni). Confermi di avere almeno 18 anni?
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="btn-age-decline"
                onClick={() => handleVerify(false)}
                className="flex-1 py-3 px-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium transition-all text-sm flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" /> No, esci
              </button>
              <button
                id="btn-age-accept"
                onClick={() => handleVerify(true)}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-slate-950 font-bold transition-all shadow-lg shadow-red-500/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="h-4 w-4" /> Sì, ho +18 anni
              </button>
            </div>

            <p className="text-[11px] text-zinc-600 mt-6 tracking-wide uppercase">
              Coltivazione e sementi certificate • 100% Legale in Italia
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
