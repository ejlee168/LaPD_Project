import Link from "next/link";

export function NavHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          LaPD
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cases</Link>
          <Link href="/editor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Create</Link>
          <Link href="/anki" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Anki Packs</Link>
        </nav>
      </div>
    </header>
  );
}
