import React from 'react';
import { Layers, ShieldCheck, Lock } from 'lucide-react';
import logoPiccolo from '../../LOGO PICCOLO.png';

interface NavbarProps {
  onNavClick: (section: string) => void;
  activeSection: string;
  isAdminMode: boolean;
  onAdminClick: () => void;
}

export default function Navbar({ onNavClick, activeSection, isAdminMode, onAdminClick }: NavbarProps) {
  return (
    <nav
      id="main-navbar"
      className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-slate-950/60 backdrop-blur-md transition-all duration-300"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo Brand */}
          <div 
            id="brand-logo"
            onClick={() => onNavClick('catalog')} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="relative flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-105">
              <img 
                src={logoPiccolo} 
                alt="Logo" 
                className="h-full w-full object-contain" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-base font-bold tracking-tight text-white leading-none">
                ELEGANT<span className="text-rose-400">SMOKING</span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="flex items-center gap-3">
            {[
              { id: 'catalog', label: 'Catalogo', icon: Layers },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id && !isAdminMode;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => onNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}

            {/* Admin toggle area */}
            <button
              onClick={onAdminClick}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer border ${
                isAdminMode
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              {isAdminMode ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  <span>Pannello Admin</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Area Riservata</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}

