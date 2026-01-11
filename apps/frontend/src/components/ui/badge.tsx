import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Custom color variants
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        green: "bg-green-500/10 text-green-400 border-green-500/20",
        orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        red: "bg-red-500/10 text-red-400 border-red-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Status Badge Helper
export const StatusBadge = ({ status, className }: { status: string; className?: string }) => {
  const variants: Record<string, BadgeProps["variant"]> = {
    active: "green",
    completed: "blue",
    awaiting: "orange",
    pending: "orange",
    cancelled: "red",
    error: "red",
  };
  return <Badge variant={variants[status.toLowerCase()] || "secondary"} className={className}>{status}</Badge>;
};

// Rarity Badge Helper (for CS2 items)
export const RarityBadge = ({ rarity, className }: { rarity: string; className?: string }) => {
  const rarityColors: Record<string, string> = {
    consumer: "text-gray-400 border-gray-500",
    industrial: "text-blue-300 border-blue-400",
    milspec: "text-blue-500 border-blue-500",
    restricted: "text-purple-500 border-purple-500",
    classified: "text-pink-500 border-pink-500",
    covert: "text-red-500 border-red-500",
    gold: "text-yellow-500 border-yellow-500",
    contraband: "text-orange-500 border-orange-500",
  };
  return (
    <Badge
      variant="outline"
      className={cn(rarityColors[rarity.toLowerCase()] || "text-gray-400", className)}
    >
      {rarity}
    </Badge>
  );
};

export { Badge, badgeVariants }

