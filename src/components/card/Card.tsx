import { Card as ShadCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

const Card = ({ children, className }: CardProps) => {
  return (
    <ShadCard className={cn("flex flex-col gap-4 border border-border bg-card p-8 shadow-lg", className)}>
      {children}
    </ShadCard>
  );
};

export default Card;
