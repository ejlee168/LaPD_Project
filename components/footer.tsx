import { Button } from "./ui/button"
import { LuGamepad2 } from "react-icons/lu"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="relative border-t py-6 px-10 text-center text-sm text-muted-foreground">
      2026 | built by ethan, lachie, mason, bowen, rachel, and jack for the UQMD LaPD Project*
      <br />
      <span className="text-[11px] italic">*educational purposes only</span>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground absolute right-4 bottom-4"
        aria-label={"code-red-link"}
        data-no-click-sound
      // onClick={() => router.push("/code-red")}
      >
        <Link href="/code-red"><LuGamepad2 /></Link>
      </Button>
    </footer>
  );
}
