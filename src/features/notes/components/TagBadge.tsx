import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HighlightedText } from "../search/search-utils";

type TagBadgeProps = {
  tag: string;
  query?: string;
  onClick?: (tag: string) => void;
  onRemove?: (tag: string) => void;
};

const TagBadge = ({ tag, query, onClick, onRemove }: TagBadgeProps) => {
  return (
    <Badge
      variant="secondary"
      className="cursor-pointer gap-0.5 text-xs transition-colors hover:bg-secondary/80 hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(tag);
      }}
    >
      {query ? HighlightedText({ text: tag, query }) : tag}
      {onRemove && (
        <button
          className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
};

export default TagBadge;
