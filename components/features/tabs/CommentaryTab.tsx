import { Button } from "@/components/ui/Button";

export default function CommentaryTab() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-3">
          AI Live Commentary
        </h2>
        <p className="text-gray-400 text-sm">
          Experience realistic AI-generated commentary for your matches
        </p>
      </div>

      {/* Content Placeholder */}
      <div className="bg-[#0f1f3a] border border-gray-800 rounded-xl p-16 text-center">
        <p className="text-gray-500 mb-6">Commentary feature coming soon</p>
        <Button variant="secondary" className="bg-gray-700 hover:bg-gray-600">
          Learn More
        </Button>
      </div>
    </div>
  );
}
