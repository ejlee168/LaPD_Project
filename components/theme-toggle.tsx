"use client"

import { LuSun, LuMoon } from "react-icons/lu"
import { MdComputer } from "react-icons/md"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-muted-foreground" render={<Button variant="ghost" size="icon" />}>
        <LuSun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <LuMoon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-0">
        <DropdownMenuItem onClick={() => setTheme("light")} className={`justify-center ${theme === "light" ? "text-foreground bg-muted/50" : "text-muted-foreground hover:text-foreground"}`}>
          <LuSun className="size-4" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className={`justify-center ${theme === "dark" ? "text-foreground bg-muted/50" : "text-muted-foreground hover:text-foreground"}`}>
          <LuMoon className="size-4" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className={`justify-center ${theme === "system" ? "text-foreground bg-muted/50" : "text-muted-foreground hover:text-foreground"}`}>
          <MdComputer className="size-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
