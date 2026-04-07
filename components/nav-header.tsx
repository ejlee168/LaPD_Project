import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShuffleButton } from "@/components/shuffle-button";

export function NavHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* <Link href="/" className="hover:scale-103 active:scale-100 transition-transform flex items-center gap-2 text-lg font-bold shrink-0">
            LaPD
          </Link> */}
          <ShuffleButton />
        </div>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link href="/anki" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">anki</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">cases</Link>
          <Link href="/editor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">create</Link>
          <div className="-translate-x-2">
            <ThemeToggle />
          </div>

        </nav>
      </div>
    </header>
  );
}
