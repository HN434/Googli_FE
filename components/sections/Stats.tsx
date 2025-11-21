export default function Stats() {
  const stats = [
    { value: "10s", label: "Real-time video delay" },
    { value: "12+", label: "Languages of video support output" },
    { value: "98%", label: "Match image accuracy" },
  ];

  return (
    <section className="py-16 px-6 bg-gray-900">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-gray-800/30 border border-gray-700 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors"
            >
              <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
