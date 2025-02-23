export default function StatsCard({ title, value }) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-white text-xl font-bold">{value}</p>
      </div>
    );
  }