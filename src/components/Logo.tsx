import logoUrl from "@/assets/edosubeb-logo.png";

export function Logo({ className = "h-9 w-9", alt = "EdoSUBEB logo" }: { className?: string; alt?: string }) {
  return <img src={logoUrl} alt={alt} className={`${className} object-contain`} />;
}

export { logoUrl };
