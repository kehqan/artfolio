// Icons for personal sites: lucide, plus the few brand marks it doesn't have.
export { ArrowRight, Globe, ImageIcon, Instagram, Linkedin, MapPin, MessageSquare } from "lucide-react";

export function Behance({ size = 16, ...rest }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
      <path d="M8.2 11.3c.9-.4 1.4-1.2 1.4-2.2C9.6 7 8 6 5.9 6H1v12h5.1c2.2 0 4.1-1.1 4.1-3.4 0-1.5-.8-2.8-2-3.3zM3.3 8h2.3c.9 0 1.7.3 1.7 1.3S6.7 10.6 5.8 10.6H3.3V8zm2.6 8H3.3v-3.3h2.6c1.1 0 1.9.5 1.9 1.7S7 16 5.9 16zM18.4 9.1c-2.7 0-4.5 2-4.5 4.6 0 2.7 1.7 4.6 4.5 4.6 2.1 0 3.5-.9 4.2-3h-2.2c-.2.7-1.1 1.1-1.9 1.1-1.4 0-2.2-.8-2.3-2.2h6.5c.2-2.8-1.3-5.1-4.3-5.1zm-2.2 3.6c.1-1.1.8-1.8 2.1-1.8 1.2 0 1.9.7 2 1.8h-4.1zM15.7 6.7h5.3V8h-5.3z" />
    </svg>
  );
}
