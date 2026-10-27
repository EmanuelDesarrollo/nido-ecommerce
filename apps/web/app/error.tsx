"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl">🙈</p>
      <h1 className="text-xl font-bold">Algo se rompió en esta pantalla</h1>
      <p className="text-stone-600">No perdiste nada: tus sorpresas siguen guardadas.</p>
      <button onClick={reset} className={buttonClass.primary}>
        Reintentar
      </button>
      <Link href="/home" className={buttonClass.ghost}>
        Ir al inicio
      </Link>
    </main>
  );
}
