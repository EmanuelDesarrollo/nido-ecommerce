import Link from "next/link";

export const buttonClass = {
  primary:
    "inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-coral-500 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-coral-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-5 py-3.5 font-semibold text-coral-700 transition hover:bg-coral-50 active:scale-[0.98] disabled:opacity-50",
  ghost: "text-sm font-medium text-coral-700 underline-offset-4 hover:underline",
};

export function chipClass(selected: boolean, disabled = false): string {
  return [
    "rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95",
    selected ? "border-coral-500 bg-coral-500 text-white" : "border-sand bg-white text-ink hover:border-coral-200",
    disabled ? "cursor-not-allowed opacity-40 line-through" : "",
  ].join(" ");
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sand ${className}`}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-stone-500" role="status">
      <span className="size-8 animate-spin rounded-full border-4 border-coral-100 border-t-coral-500" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="text-center">
      <p className="text-3xl">😕</p>
      <p className="mt-2 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className={`${buttonClass.secondary} mt-4`}>
          Reintentar
        </button>
      )}
    </Card>
  );
}

export function EmptyState({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-sand px-5 py-8 text-center">
      <p className="text-3xl">{emoji}</p>
      <p className="mt-2 font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-stone-500">{children}</div>}
    </div>
  );
}

export function BackLink({ href, label = "Volver" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-ink">
      ← {label}
    </Link>
  );
}
