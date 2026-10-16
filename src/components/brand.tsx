import Image from "next/image";
import { siteConfig } from "@/config/site";

export function BrandMark({ className = "size-10" }: { className?: string }) {
  return <Image src="/brand/isotype.svg" alt="" aria-hidden="true" width={64} height={64} className={`shrink-0 dark:invert ${className}`} />;
}

export function BrandLogo() {
  return <span className="inline-flex items-center gap-3 text-foreground" aria-label={siteConfig.name}>
    <BrandMark />
    <span aria-hidden="true" className="flex flex-col font-heading leading-none">
      <span className="text-[1.05rem] font-semibold tracking-[-0.055em]">David Aranda<span className="text-muted-foreground">.</span></span>
      <span className="mt-1.5 font-mono text-[0.55rem] tracking-[0.17em] uppercase">davidaranda.dev</span>
    </span>
  </span>;
}
