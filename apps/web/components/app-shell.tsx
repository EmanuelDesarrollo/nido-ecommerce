"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/session";
import { Avatar } from "./avatar";
import { Spinner } from "./ui";

/** Page frame for signed-in screens: header with the current user, and a redirect to "/" without one. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, signOut } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10">
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between bg-cream/90 px-4 py-3 backdrop-blur">
        <Link href="/home" className="text-lg font-bold text-coral-600">
          Nido <span className="font-medium text-stone-400">· Corazonada</span>
        </Link>
        {user && (
          <button
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm shadow-sm ring-1 ring-sand"
            title="Cambiar de usuario"
          >
            <Avatar user={user} size={28} />
            {user.name}
            <span className="text-stone-400">⇄</span>
          </button>
        )}
      </header>
      {user ? children : <Spinner />}
    </div>
  );
}
