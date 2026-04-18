import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/fade-in";

export default function LobbyNotFound() {
  return (
    <FadeIn className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center max-w-md mx-auto">
      <h2 className="text-2xl font-bold">Lobby not found</h2>
      <p className="text-muted-foreground">
        This lobby code doesn&apos;t exist. It may have been closed after all players
        left, or you mistyped the code.
      </p>
      <div className="flex gap-2">
        <Link href="/code-red">
          <Button>Back to Code Red</Button>
        </Link>
      </div>
    </FadeIn>
  );
}
