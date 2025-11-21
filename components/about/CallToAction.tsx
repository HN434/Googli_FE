import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function CallToAction() {
  return (
    <section className="py-24 px-6 bg-gray-900">
      <div className="container mx-auto text-center max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to elevate your game?
        </h2>
        <p className="text-gray-400 mb-8">
          Explore the powerful features that make Googli.ai the ultimate cricket companion.
        </p>
        <Link href="/#features">
          <Button variant="primary" className="text-base px-8 py-3.5">
            Explore Our Features →
          </Button>
        </Link>
      </div>
    </section>
  );
}
