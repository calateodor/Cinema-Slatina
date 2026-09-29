import { cn } from "@/lib/utils";

/**
 * Glare Hover — port după react-bits (reactbits.dev/animations/glare-hover):
 * o dungă de lumină care trece în diagonală peste afiș când cursorul intră pe
 * card. Se pune ca ultim copil într-un element `relative` dintr-un `group`;
 * tot efectul e în CSS (`.glare` din globals.css).
 */
export function Glare({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("glare", className)} />;
}
