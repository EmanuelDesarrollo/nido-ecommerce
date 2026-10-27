import { HealthStatus } from "./health-status";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold text-coral-500">Nido · Corazonada 🎁</h1>
      <p className="text-stone-600">El regalo sorpresa con pistas.</p>
      <div className="w-full rounded-2xl bg-white p-4 shadow-sm">
        <HealthStatus />
      </div>
    </main>
  );
}
