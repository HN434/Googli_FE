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
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg" />
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
