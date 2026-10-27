"use client";

import { SocketEvent, type SocketEventPayloads } from "@nido/shared";
import { useRouter } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useMemo, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { API_URL } from "./api";
import { useSession } from "./session";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const socket = useMemo(
    () => (user ? io(API_URL, { transports: ["websocket"], auth: { userId: user.id }, autoConnect: false }) : null),
    [user],
  );

  useEffect(() => {
    socket?.connect();
    return () => {
      socket?.close();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      <Suspense fallback={null}>
        <LiveToasts />
      </Suspense>
      {children}
    </SocketContext.Provider>
  );
}

/** Subscribes to one socket event for the lifetime of the component. */
export function useSocketEvent<E extends SocketEvent>(event: E, handler: (payload: SocketEventPayloads[E]) => void) {
  const socket = useContext(SocketContext);
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => {
    if (!socket) return;
    const listener = (payload: SocketEventPayloads[E]) => handlerRef.current(payload);
    socket.on(event as string, listener);
    return () => {
      socket.off(event as string, listener);
    };
  }, [socket, event]);
}

/** Calls onChange whenever any live event arrives (optionally only for one gift). */
export function useGiftEvents(onChange: () => void, giftId?: string) {
  const handle = (payload: { giftId: string }) => {
    if (!giftId || payload.giftId === giftId) onChange();
  };
  useSocketEvent(SocketEvent.CLUES_REQUESTED, handle);
  useSocketEvent(SocketEvent.CLUES_ANSWERED, handle);
  useSocketEvent(SocketEvent.PAYMENT_UPDATED, handle);
  useSocketEvent(SocketEvent.ON_THE_WAY, handle);
  useSocketEvent(SocketEvent.REVEALED, handle);
  useSocketEvent(SocketEvent.THANKED, handle);
}

/** Global notifications. Skipped when the user is already looking at that gift: the page updates live. */
function LiveToasts() {
  const router = useRouter();
  const onGiftPage = (giftId: string) => window.location.pathname.includes(giftId);
  const go = (path: string, label: string) => ({ label, onClick: () => router.push(path) });

  useSocketEvent(SocketEvent.CLUES_REQUESTED, ({ giftId }) => {
    if (onGiftPage(giftId)) return;
    toast("Alguien está preparando una sorpresa para ti 🎁", {
      description: "Danos unas pistas, sin spoilers.",
      action: go(`/clues/${giftId}`, "Dar pistas"),
    });
  });
  useSocketEvent(SocketEvent.CLUES_ANSWERED, ({ giftId, clues }) => {
    if (onGiftPage(giftId) || !clues) return;
    toast("¡Llegaron las pistas! 🕵️", { action: go(`/gift/${giftId}`, "Ver") });
  });
  useSocketEvent(SocketEvent.PAYMENT_UPDATED, ({ giftId, paymentStatus, failureReason }) => {
    if (onGiftPage(giftId)) return;
    if (paymentStatus === "APPROVED") toast.success("Pago aprobado. ¡Tu sorpresa va en camino!");
    if (paymentStatus === "REJECTED") toast.error(`Pago rechazado: ${failureReason ?? "intenta de nuevo"}`);
  });
  useSocketEvent(SocketEvent.ON_THE_WAY, ({ giftId }) => {
    if (onGiftPage(giftId)) return;
    toast("Tu sorpresa va en camino 🎁", { action: go(`/reveal/${giftId}`, "Destapar") });
  });
  useSocketEvent(SocketEvent.REVEALED, ({ giftId, recipientName }) => {
    if (onGiftPage(giftId)) return;
    toast(`${recipientName} está viendo tu regalo 👀`, { action: go(`/gift/${giftId}`, "Ver") });
  });
  useSocketEvent(SocketEvent.THANKED, ({ giftId, recipientName, reaction }) => {
    if (onGiftPage(giftId)) return;
    toast(`${recipientName} reaccionó ${reaction}`, { action: go(`/gift/${giftId}`, "Ver") });
  });
  return null;
}
