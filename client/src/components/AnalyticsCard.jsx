export default function AnalyticsCard({ icon, label, value }) {
    return (
      <div className="flex items-center gap-4 bg-white rounded-2xl shadow-lg border border-blue-100 p-8 min-w-[220px] flex-1">
        <div className="text-blue-700 text-3xl bg-blue-100 rounded-xl p-4">
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold text-black">{value}</div>
          <div className="text-blue-800 text-base">{label}</div>
        </div>
      </div>
    );
  }