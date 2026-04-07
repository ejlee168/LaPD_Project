import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="text-lg font-bold shrink-0">
            LaPD
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cases</Link>
          <Link href="/editor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Create</Link>
          <Link href="/anki" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Anki</Link>
        </nav>
      </div>
    </header>
  );
}
