import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0f1f3a] border-t border-gray-800/50 py-10">
      <div className="container mx-auto px-6">
        <div className="text-center mb-6">
          <p className="text-gray-500 text-xs mb-4">
            © 2025-2026 Googli.ai. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs mb-4">
            Developed by: Real Stable Roundtable
          </p>
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/privacy" className="text-gray-500 hover:text-emerald-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-500 hover:text-emerald-400 transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
