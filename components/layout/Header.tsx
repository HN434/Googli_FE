"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Helper function to check if link is active
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Get link classes based on active state
  const getLinkClasses = (href: string) => {
    const baseClasses = "transition-colors relative";
    const activeClasses = "text-emerald-400 font-semibold";
    const inactiveClasses = "text-gray-300 hover:text-white";

    return `${baseClasses} ${isActive(href) ? activeClasses : inactiveClasses}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-800/70 backdrop-blur-sm border-b border-gray-700">
      <nav className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-800/90 border border-emerald-500/30 flex items-center justify-center">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none">
              <defs>
                <linearGradient id="logo-googli-gradient" x1="0" x2="1" y1="1" y2="0">
                  <stop offset="0%" stopColor="#10b981"></stop>
                  <stop offset="100%" stopColor="#3b82f6"></stop>
                </linearGradient>
                <filter id="logo-glow-filter">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"></feGaussianBlur>
                  <feMerge>
                    <feMergeNode in="coloredBlur"></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="50" cy="50" r="45" stroke="url(#logo-googli-gradient)" strokeWidth="3" opacity="0.4" filter="url(#logo-glow-filter)"></circle>
              <circle cx="50" cy="50" r="45" stroke="url(#logo-googli-gradient)" strokeWidth="3"></circle>
              <path d="M 30 25 C 40 40, 40 60, 30 75
                 M 70 25 C 60 40, 60 60, 70 75
                 M 50 10 V 20 M 50 80 V 90
                 M 40 15 L 45 20 M 60 15 L 55 20
                 M 40 85 L 45 80 M 60 85 L 55 80" stroke="url(#logo-googli-gradient)" strokeWidth="2.5" strokeLinecap="round"></path>
            </svg>
          </div>
          <span className="text-xl font-bold text-white">Googli.ai</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/about" className={getLinkClasses('/about')}>
            About
            {isActive('/about') && (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </Link>
          <Link href="/features" className={getLinkClasses('/features')}>
            Features
            {isActive('/features') && (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </Link>
          {/* <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">
            Pricing
          </Link> */}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>

        <div className="hidden md:flex items-center gap-4">
          {/* <Button variant="ghost">Login</Button>
          <Button variant="primary">Sign Up</Button> */}
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link
              href="/about"
              className={`${getLinkClasses('/about')} py-2 flex items-center justify-between`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>About</span>
              {isActive('/about') && (
                <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              )}
            </Link>
            <Link
              href="/features"
              className={`${getLinkClasses('/features')} py-2 flex items-center justify-between`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Features</span>
              {isActive('/features') && (
                <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              )}
            </Link>
            {/* <Link 
              href="#pricing" 
              className="text-gray-300 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link> */}
            {/* <div className="flex flex-col gap-2 pt-2 border-t border-gray-700">
              <Button variant="ghost">Login</Button>
              <Button variant="primary">Sign Up</Button>
            </div> */}
          </div>
        </div>
      )}
    </header>
  );
}
