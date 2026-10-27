"use client";

import type { UserDto } from "@nido/shared";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { ErrorState, Spinner } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";

export function SignInView() {
  const { data: users, error, loading, reload } = useApi<UserDto[]>("/users");
  const { signIn } = useSession();
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <p className="text-5xl">🎁</p>
        <h1 className="mt-3 text-3xl font-bold text-coral-600">Corazonada</h1>
        <p className="mt-2 text-stone-600">
          El regalo sorpresa con pistas: quien recibe participa sin saber qué le van a regalar ni quién.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-center text-sm font-semibold tracking-wide text-stone-500 uppercase">Entrar como…</h2>
        {loading && !users && <Spinner label="Despertando el servidor…" />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {users?.length === 0 && <ErrorState message="No hay usuarios cargados todavía." onRetry={reload} />}
        {users?.map((user) => (
          <button
            key={user.id}
            onClick={() => {
              signIn(user);
              router.push("/home");
            }}
            className="flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-sand transition hover:ring-coral-200 active:scale-[0.98]"
          >
            <Avatar user={user} size={56} />
            <span className="flex-1 text-lg font-semibold">{user.name}</span>
            <span className="text-coral-500">→</span>
          </button>
        ))}
      </section>

      <p className="text-center text-xs text-stone-400">
        Demo sin login: abre una ventana normal y otra incógnita (o dos pestañas) y entra con cada persona.
      </p>
    </main>
  );
}
