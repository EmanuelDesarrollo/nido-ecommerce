"use client";

import { Toaster } from "sonner";
import { SessionProvider } from "@/lib/session";
import { SocketProvider } from "@/lib/socket";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SocketProvider>{children}</SocketProvider>
      <Toaster position="top-center" richColors closeButton />
    </SessionProvider>
  );
}
