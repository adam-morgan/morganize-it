import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg";

type BrandLogoProps = {
  size?: BrandLogoSize;
  layout?: "row" | "column";
  showText?: boolean;
  showIcon?: boolean;
  className?: string;
};

const sizeConfig = {
  sm: { img: "h-10 w-10", text: "text-lg", gap: "gap-2", src: "/logo-80.png" },
  md: { img: "h-28 w-28", text: "text-3xl", gap: "gap-4", src: "/logo-192.png" },
  lg: { img: "h-40 w-40", text: "text-4xl", gap: "gap-4", src: "/logo-192.png" },
} as const;

const BrandLogo = ({
  size = "md",
  layout = "row",
  showText = true,
  showIcon = true,
  className,
}: BrandLogoProps) => {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "flex items-center",
        layout === "column" ? "flex-col" : "flex-row",
        config.gap,
        className,
      )}
    >
      {showIcon && (
        <div className={cn(config.img, "rounded-xl bg-muted/80 p-1")}>
          <img
            src={config.src}
            alt="MorganizeIt logo"
            className="h-full w-full object-contain"
          />
        </div>
      )}
      {showText && (
        <span
          className={cn(
            "font-brand font-semibold tracking-tight text-foreground",
            config.text,
          )}
        >
          <span className="font-bold text-brand-purple">M</span>
          organizeIt
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
