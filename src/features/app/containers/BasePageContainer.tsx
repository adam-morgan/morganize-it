import { BasePage } from "@/components";
import { ReactNode, useEffect } from "react";
import { useMaskSlice } from "../maskSlice";
import { useAlertSlice } from "../alertSlice";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const BasePageContainer = ({ children }: { children: ReactNode }) => {
  const { getMaskText } = useMaskSlice();
  const { getCurrentAlert, popAlert } = useAlertSlice();

  const alert = getCurrentAlert();

  useEffect(() => {
    if (!alert) return;

    const typeMap = {
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      success: toast.success,
    } as const;

    const show = typeMap[alert.severity] ?? toast;
    show(alert.message);
    popAlert();
  }, [alert, popAlert]);

  return (
    <BasePage maskText={getMaskText()}>
      <>
        {children}
        <Toaster position="bottom-center" />
      </>
    </BasePage>
  );
};

export default BasePageContainer;
