import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { Product, GramOption } from '../types';

interface ProductCardProps {
  key?: string;
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const sizeOptions = Object.keys(product.prices || {}).length > 0 
    ? Object.keys(product.prices) 
    : ['1.5g'];
  const [selectedSize, setSelectedSize] = useState<GramOption>(sizeOptions[0] || '1.5g');
  const [isMuted, setIsMuted] = useState(true);
  
  // Safe resolution if the selectedSize is no longer present or if options changed
  const activeSize = product.prices[selectedSize] !== undefined ? selectedSize : sizeOptions[0];
  const currentPrice = product.prices[activeSize] || 0;

  // Extract weight number and label to calculate unit price
  const parseWeightNumber = (str: string): number | null => {
    const match = str.replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)/);
    return match ? parseFloat(match[1]) : null;
  };

  const weightNum = parseWeightNumber(activeSize);
  const isGram = activeSize.toLowerCase().includes('g') || activeSize.toLowerCase().includes('gram');
  const unitLabel = isGram ? 'g' : 'u';
  
  // Custom aura colors per category
  const isWeed = product.category === 'weed';
  const auraClass = isWeed
    ? 'shadow-[0_0_15px_rgba(244,63,94,0.18)] border-rose-500/20 hover:shadow-[0_0_30px_rgba(244,63,94,0.35)] hover:border-rose-400/40'
    : 'shadow-[0_0_15px_rgba(239,68,68,0.18)] border-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,0.35)] hover:border-red-400/40';

  const glowColor = isWeed ? 'bg-rose-500/5' : 'bg-red-500/5';

  return (
    <motion.div
      layout
      transition={{ duration: 0.4, type: 'spring' }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-slate-900/50 text-white backdrop-blur-md transition-all duration-300 ${auraClass}`}
    >
      {/* Dynamic ambient background glow */}
      <div className={`absolute -inset-0.5 rounded-3xl ${glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      {/* Media container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
        {product.image && (product.image.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v|avi)(?:\?|$)/i.test(product.image)) ? (
          <>
            <video
              src={product.image}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Mute/Unmute toggle button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-3 right-3 z-20 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-white transition-all cursor-pointer flex items-center justify-center shadow-lg"
              title={isMuted ? "Attiva audio" : "Disattiva audio"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-zinc-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-rose-400 animate-pulse" />
              )}
            </button>
          </>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        )}
        
        {/* Absolute category badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${
            isWeed 
              ? 'bg-rose-950/80 text-rose-300 border-rose-500/30' 
              : 'bg-red-950/80 text-red-300 border-red-500/30'
          }`}>
            {isWeed ? 'Weed 🌿' : 'Hash 🍫'}
          </span>
        </div>
      </div>

      {/* Product content */}
      <div className="flex flex-col flex-1 p-6 z-10">
        <h3 className={`text-lg font-black tracking-tight text-white mb-4 transition-colors ${
          isWeed ? 'group-hover:text-rose-400' : 'group-hover:text-red-400'
        }`}>
          {product.name}
        </h3>

        {/* Weight Selector (Quantitativo) */}
        <div className="mb-6">
          <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2">Quantitativo</p>
          <div className="bg-slate-950/60 p-1.5 rounded-xl border border-white/5">
            <div className="flex flex-wrap gap-1">
              {sizeOptions.map((size, idx) => (
                <button
                  key={`${size}-${idx}`}
                  onClick={() => setSelectedSize(size)}
                  className={`flex-1 min-w-[50px] py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                    activeSize === size
                      ? (isWeed 
                          ? 'bg-gradient-to-b from-white/10 to-white/5 border border-rose-500/30 text-rose-400 shadow-md' 
                          : 'bg-gradient-to-b from-white/10 to-white/5 border border-red-500/30 text-red-400 shadow-md')
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Valuation display (Prezzo) with no "add" or "buy" actions */}
        <div className="mt-auto pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-0.5">Prezzo Stimato</p>
            <span className="text-xl sm:text-2xl font-black text-white font-mono leading-none">
              €{currentPrice.toFixed(2)}
            </span>
          </div>

          <div className="text-right">
            {weightNum && weightNum > 0 ? (
              <span className="text-[10px] text-zinc-400 font-mono">
                ~ €{(currentPrice / weightNum).toFixed(2)}/{unitLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
