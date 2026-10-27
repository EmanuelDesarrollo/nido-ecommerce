import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl">🎁❓</p>
      <h1 className="text-xl font-bold">Esta página no existe</h1>
      <Link href="/home" className={buttonClass.primary}>
        Ir al inicio
      </Link>
    </main>
  );
}
