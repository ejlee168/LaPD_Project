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
  const showComputer = theme === "system"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-muted-foreground" render={<Button variant="ghost" size="icon" />}>
        {showComputer ? (
          <MdComputer className="h-[1.2rem] w-[1.2rem]" />
        ) : (
          <>
            <LuSun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <LuMoon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </>
        )}
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-0">
        <DropdownMenuItem onClick={() => setTheme("light")} className="text-muted-foreground hover:text-foreground justify-center">
          <LuSun className="size-4" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="text-muted-foreground hover:text-foreground justify-center">
          <LuMoon className="size-4" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="text-muted-foreground hover:text-foreground justify-center">
          <MdComputer className="size-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
