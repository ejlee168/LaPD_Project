import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted relative overflow-hidden",
        "after:absolute after:inset-0 after:-translate-x-full",
        "after:animate-[shimmer_1.5s_infinite]",
        "after:bg-linear-to-r after:from-transparent after:via-foreground/5 after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
