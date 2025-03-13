import { BasePage } from "@/components";
import { ReactNode } from "react";
import { useMaskSlice } from "../maskSlice";
import { useAlertSlice } from "../alertSlice";
import { Alert, Snackbar } from "@mui/material";

const BasePageContainer = ({ children }: { children: ReactNode }) => {
  const { getMaskText } = useMaskSlice();
  const { getCurrentAlert, popAlert } = useAlertSlice();

  const alert = getCurrentAlert();

  return (
    <BasePage maskText={getMaskText()}>
      <>
        {children}
        <Snackbar
          open={Boolean(alert)}
          autoHideDuration={5000}
          onClose={popAlert}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={alert?.severity}>{alert?.message}</Alert>
        </Snackbar>
      </>
    </BasePage>
  );
};

export default BasePageContainer;
