import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function EditorialHero() {
  const { user } = useAuthStore();

  return (
    <div className="relative min-h-screen bg-matte-editorial text-zinc-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Editorial Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-4 flex items-center justify-between z-20">
        {/* Left Target-Orbit Abstract Logo */}
        <Link to="/" className="flex items-center space-x-3 group" aria-label="Virexo Home">
          <div className="w-10 h-10 rounded-full border border-amber-200/50 flex items-center justify-center relative bg-zinc-900/60 shadow-lg group-hover:border-amber-300 transition-all duration-300">
            <svg className="w-6 h-6 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeWidth="1.2" strokeDasharray="2 2" />
              <circle cx="12" cy="12" r="5" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-10 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
          <Link to="/" className="text-amber-200 hover:text-white transition">Home</Link>
          <a href="#about" className="hover:text-amber-200 transition">About</a>
          <a href="#gallery" className="hover:text-amber-200 transition">Gallery</a>
          <a href="#event" className="hover:text-amber-200 transition">Event</a>
          <a href="#contact" className="hover:text-amber-200 transition">Contact</a>
        </nav>

        {/* Right Gold Outline Login Button */}
        <div>
          {user ? (
            <Link
              to="/conversations"
              className="gold-wireframe-btn text-xs uppercase px-6 py-2.5 rounded-none font-bold inline-block"
            >
              Workspace
            </Link>
          ) : (
            <Link
              to="/login"
              className="gold-wireframe-btn text-xs uppercase px-7 py-2.5 rounded-none font-semibold inline-block"
            >
              Loging
            </Link>
          )}
        </div>
      </header>

      {/* Hero Body Layout */}
      <main className="w-full max-w-7xl mx-auto px-6 lg:px-12 flex-1 grid grid-cols-1 lg:grid-cols-12 items-center gap-12 py-12 z-10">
        
        {/* Left Column - Headline & Content */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-light tracking-tight leading-[1.1]">
              <span className="text-gradient-sunset block font-medium">Creativity</span>
              <span className="text-gradient-sunset block font-normal">never ends</span>
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed tracking-wide font-light">
            Virexo real-time chat platform. Engineered with high-frequency PostgreSQL messaging, Socket.IO engine, and privacy-first architecture.
          </p>

          <div className="pt-2">
            <Link
              to={user ? "/conversations" : "/register"}
              className="gold-wireframe-btn text-xs uppercase px-10 py-3.5 rounded-none font-bold tracking-[0.25em] inline-block shadow-xl"
            >
              {user ? "OPEN MESSAGES" : "GET STARTED"}
            </Link>
          </div>
        </div>

        {/* Right Column - Surreal Hero Visual Collage */}
        <div className="lg:col-span-6 relative flex items-center justify-center h-[480px] sm:h-[540px]">
          
          {/* Ambient Background Radial Glow */}
          <div className="absolute w-80 h-80 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none animate-pulse-glow" />

          {/* Canvas Collage Container */}
          <div className="relative w-full max-w-md h-full flex items-center justify-center">
            
            {/* SVG Rotating Dual Orbital Rings */}
            <svg className="absolute w-[420px] h-[420px] pointer-events-none z-10 opacity-80" viewBox="0 0 400 400">
              <g className="animate-orbit-slow">
                <ellipse
                  cx="200"
                  cy="200"
                  rx="180"
                  ry="70"
                  fill="none"
                  stroke="url(#ringGradient1)"
                  strokeWidth="2"
                  transform="rotate(-25 200 200)"
                />
              </g>
              <g className="animate-orbit-reverse">
                <ellipse
                  cx="200"
                  cy="200"
                  rx="160"
                  ry="85"
                  fill="none"
                  stroke="url(#ringGradient2)"
                  strokeWidth="1.5"
                  strokeDasharray="8 4"
                  transform="rotate(35 200 200)"
                />
              </g>
              <defs>
                <linearGradient id="ringGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f7d794" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#f8a5c2" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#c4f0c2" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="ringGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f8a5c2" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f7d794" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>

            {/* Central Monochromatic Artistic Figure */}
            <div className="relative w-64 h-80 sm:w-72 sm:h-96 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-800/80 to-zinc-950 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800"
                alt="Editorial Hero Figure"
                className="w-full h-full object-cover grayscale opacity-85 mix-blend-luminosity contrast-125"
              />
              
              {/* Surreal Cloud Mist Overlay */}
              <div className="absolute top-2 inset-x-0 h-32 bg-gradient-to-b from-white/30 via-white/10 to-transparent backdrop-blur-xs rounded-full animate-float-gentle" />
              
              {/* Internal Vignette Shadow */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/40" />
            </div>

            {/* Floating Surreal Micro-Elements */}
            
            {/* 1. Rose Gold Paper Airplane */}
            <div className="absolute top-12 left-4 z-20 animate-float-gentle">
              <svg className="w-8 h-8 text-rose-300 drop-shadow-[0_4px_10px_rgba(248,165,194,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>

            {/* 2. Planetary Ring Badge */}
            <div className="absolute top-16 right-2 z-20 animate-float-gentle" style={{ animationDelay: '1.5s' }}>
              <div className="w-10 h-10 rounded-full bg-rose-400/20 border border-rose-300/40 backdrop-blur-md flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M2 12c4-3 16-3 20 0" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

            {/* 3. Floating Pink Puzzle Piece */}
            <div className="absolute bottom-28 left-2 z-20 animate-float-gentle" style={{ animationDelay: '2.5s' }}>
              <div className="w-7 h-7 rounded-lg bg-pink-400/30 border border-pink-300/50 backdrop-blur-xs flex items-center justify-center text-pink-200 text-xs font-bold shadow-md">
                🧩
              </div>
            </div>

            {/* 4. Editorial Live Date Badge */}
            <div className="absolute right-0 bottom-16 text-right z-20">
              <span className="block text-2xl font-serif font-light text-zinc-100 tracking-tight">10</span>
              <span className="block text-xs font-sans uppercase tracking-[0.2em] text-zinc-400">October</span>
              <span className="block text-xs font-sans text-amber-200/80 tracking-widest">2026</span>
            </div>

            {/* 5. Circular Golden (+) Quick-Action Badge */}
            <div className="absolute right-2 bottom-2 z-20">
              <button
                type="button"
                className="w-12 h-12 rounded-full border border-amber-300/60 bg-zinc-900/80 hover:bg-amber-300/20 flex items-center justify-center text-amber-200 transition-all duration-300 shadow-xl cursor-pointer hover:scale-110 active:scale-95"
                title="Explore Platform"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Editorial Footer Section */}
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/40 z-20 gap-4">
        {/* Social Media Links */}
        <div className="flex items-center space-x-6 text-zinc-400">
          <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:text-amber-200 transition">
            <Twitter className="w-4 h-4" />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-amber-200 transition">
            <Facebook className="w-4 h-4" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-amber-200 transition">
            <Instagram className="w-4 h-4" />
          </a>
        </div>

        {/* Copyright notice */}
        <div className="tracking-widest uppercase font-light text-[10px]">
          © 2026 Virexo Platform • All rights reserved
        </div>
      </footer>
    </div>
  );
}
