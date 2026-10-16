import Image from "next/image";
import { siteConfig } from "@/config/site";

export function BrandMark({ className = "size-10" }: { className?: string }) {
  return <Image src="/brand/isotype.svg" alt="" aria-hidden="true" width={64} height={64} className={`shrink-0 dark:invert ${className}`} />;
}

export function BrandLogo() {
  return <span className="inline-flex items-center gap-3 text-foreground" aria-label={siteConfig.name}>
    <BrandMark />
    <span aria-hidden="true" className="font-heading text-[1.05rem] font-medium leading-none tracking-[-0.045em]">
      David Aranda<span className="text-muted-foreground">.</span>
    </span>
  </span>;
}
