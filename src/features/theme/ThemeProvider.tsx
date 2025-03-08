import { CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material";

import { ReactNode } from "react";
import { useThemeSlice } from "./themeSlice";

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { muiTheme } = useThemeSlice();

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default ThemeProvider;
