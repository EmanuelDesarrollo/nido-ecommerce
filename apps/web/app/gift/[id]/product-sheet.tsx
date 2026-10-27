"use client";

import { CATEGORY_LABELS, MAX_MESSAGE_LENGTH, ONE_SIZE, type CatalogResponse, type SenderGiftView } from "@nido/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/product-image";
import { buttonClass, chipClass } from "@/components/ui";
import { formatCop } from "@/lib/format";

export type ScoredProduct = CatalogResponse["products"][number];

/** Bottom sheet: product detail, size (preloaded from the clues) and message, then go to checkout. */
export function ProductSheet({
  product,
  gift,
  onClose,
}: {
  product: ScoredProduct;
  gift: SenderGiftView;
  onClose: () => void;
}) {
  const router = useRouter();
  const isFashion = product.category === "moda";
  const clueSize = gift.clues?.size;
  const initial =
    product.variants.find((v) => v.stock > 0 && v.size === (isFashion ? clueSize : ONE_SIZE)) ??
    product.variants.find((v) => v.stock > 0);
  const [variantId, setVariantId] = useState<number | null>(initial?.id ?? null);
  const [message, setMessage] = useState(gift.message ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function goToCheckout() {
    if (!variantId) return;
    const params = new URLSearchParams({ productId: String(product.id), variantId: String(variantId) });
    if (message.trim()) params.set("message", message.trim());
    router.push(`/gift/${gift.id}/checkout?${params}`);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 backdrop-blur-sm md:items-center md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-cream p-5 pb-8 md:max-w-2xl md:rounded-[2rem] md:p-8"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-sand md:hidden" />
        <div className="flex gap-4">
          <ProductImage src={product.imageUrl} alt={product.title} className="w-32 shrink-0 bg-white md:w-56" />
          <div className="flex flex-col gap-1">
            <span className="w-fit rounded-full bg-coral-500 px-2 py-0.5 text-xs font-bold text-white">
              Corazonada {product.score}%
            </span>
            <h3 className="font-bold leading-tight md:text-xl">{product.title}</h3>
            <p className="text-xs text-stone-500">{CATEGORY_LABELS[product.category]}</p>
            <p className="text-lg font-semibold text-coral-700">{formatCop(product.priceCop)}</p>
          </div>
        </div>

        {isFashion && (
          <div className="mt-5">
            <p className="text-sm font-semibold">
              Talla {clueSize && <span className="font-normal text-stone-500">(su pista: {clueSize})</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  disabled={v.stock === 0}
                  onClick={() => setVariantId(v.id)}
                  className={`${chipClass(variantId === v.id, v.stock === 0)} min-w-12`}
                  title={v.stock === 0 ? "Agotada" : `${v.stock} disponibles`}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mt-5 block">
          <span className="text-sm font-semibold">Mensaje para {gift.recipient.name}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={3}
            placeholder="Lo verá al destapar su regalo 💌"
            className="mt-2 w-full resize-none rounded-2xl border border-sand bg-white p-3 text-sm outline-none focus:border-coral-400"
          />
          <span className="block text-right text-xs text-stone-400">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </label>

        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className={`${buttonClass.secondary} w-auto`}>
            Cerrar
          </button>
          <button onClick={goToCheckout} disabled={!variantId} className={buttonClass.primary}>
            {variantId ? "Continuar al pago" : "Sin stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
