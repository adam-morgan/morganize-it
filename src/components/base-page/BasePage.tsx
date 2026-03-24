import { ThemeProvider } from "@/features/theme";
import { Loader2 } from "lucide-react";

type BasePageProps = {
  children: React.ReactNode;
  maskText?: string;
};

const BasePage = ({ children, maskText }: BasePageProps) => {
  return (
    <ThemeProvider>
      <div className="h-full w-full bg-background">
        {children}
      </div>
      {maskText != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>{maskText}</p>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
};

export default BasePage;
