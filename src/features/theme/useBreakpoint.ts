import { useMediaQuery, useTheme } from "@mui/material";

export const useBreakpoint = () => {
  const theme = useTheme();

  const breakpoints = {
    xs: useMediaQuery(theme.breakpoints.only("xs")),
    sm: useMediaQuery(theme.breakpoints.only("sm")),
    md: useMediaQuery(theme.breakpoints.only("md")),
    lg: useMediaQuery(theme.breakpoints.only("lg")),
    xl: useMediaQuery(theme.breakpoints.only("xl")),
  };

  return Object.entries(breakpoints).find(([, matches]) => matches)?.[0] as string;
};
