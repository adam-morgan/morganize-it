import { ThemeProvider } from "@/features/theme";
import { Backdrop, Box, CircularProgress, Typography } from "@mui/material";

type BasePageProps = {
  children: React.ReactNode;
  maskText?: string;
};

const BasePage = ({ children, maskText }: BasePageProps) => {
  return (
    <ThemeProvider>
      <Box
        sx={{
          width: "100%",
          height: "100%",
          backgroundColor: (theme) => theme.palette.background.default,
        }}
      >
        {children}
      </Box>
      <Backdrop
        sx={(theme) => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })}
        open={maskText != null}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress color="inherit" />
          <Typography>{maskText}</Typography>
        </Box>
      </Backdrop>
    </ThemeProvider>
  );
};

export default BasePage;
