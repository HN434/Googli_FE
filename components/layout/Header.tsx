import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/80 backdrop-blur-sm border-b border-gray-800">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg" />
          <span className="text-xl font-bold text-white">Googli.ai</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
            About
          </Link>
          <Link href="/#features" className="text-gray-300 hover:text-white transition-colors">
            Features
          </Link>
          {/* <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">
            Pricing
          </Link> */}
        </div>

        <div className="flex items-center gap-4">
          {/* <Button variant="ghost">Login</Button>
          <Button variant="primary">Sign Up</Button> */}
        </div>
      </nav>
    </header>
  );
}
