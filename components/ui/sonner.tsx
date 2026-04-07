"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { FaCircleCheck, FaCircleInfo, FaTriangleExclamation, FaCircleXmark, FaSpinner } from "react-icons/fa6"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <FaCircleCheck className="size-4" />
        ),
        info: (
          <FaCircleInfo className="size-4" />
        ),
        warning: (
          <FaTriangleExclamation className="size-4" />
        ),
        error: (
          <FaCircleXmark className="size-4" />
        ),
        loading: (
          <FaSpinner className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
