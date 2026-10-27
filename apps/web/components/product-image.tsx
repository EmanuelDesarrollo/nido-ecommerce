import Image from "next/image";

export function ProductImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-2xl bg-sand/60 ${className}`}>
      <Image src={src} alt={alt} fill sizes="(max-width: 640px) 50vw, 240px" className="object-contain p-2" />
    </div>
  );
}
