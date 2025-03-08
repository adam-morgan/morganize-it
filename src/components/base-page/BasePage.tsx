import { ThemeProvider } from "@/features/theme";
import { Box } from "@mui/material";

type BasePageProps = {
  children: React.ReactNode;
};

const BasePage = ({ children }: BasePageProps) => {
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
    </ThemeProvider>
  );
};

export default BasePage;
