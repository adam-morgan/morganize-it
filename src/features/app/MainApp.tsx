import AppBar from "@/components/app-bar/AppBar";
import Drawer from "@/components/drawer/Drawer";
import { useEffectOnMount } from "@/hooks/useEffectOnMount";
import MenuIcon from "@mui/icons-material/Menu";
import { Box, Divider, IconButton, styled } from "@mui/material";
import { ProfileIcon } from "../profile";
import { useBreakpoint } from "../theme";
import AppMenu from "./containers/AppMenu";
import { useMainAppSlice } from "./mainAppSlice";

const MainApp = () => {
  const { initialize, initialized, drawerOpen, setDrawerOpen } = useMainAppSlice();

  const breakpoint = useBreakpoint();

  const mobileMode = breakpoint === "xs";

  const drawerWidth = "240px";

  useEffectOnMount(() => {
    initialize(breakpoint);
  });

  if (!initialized) {
    return undefined;
  }

  let appBarOffset: string | undefined;
  let boxWidth = "100%";

  if (!mobileMode && drawerOpen) {
    appBarOffset = drawerWidth;
    boxWidth = `calc(100% - ${drawerWidth})`;
  }

  const DrawerHeader = styled("div")(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: "flex-end",
  }));

  return (
    <>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: boxWidth },
          ml: { sm: `${appBarOffset}` },
          transition: "225ms",
        }}
      >
        <AppBar
          title="Home"
          leftChildren={
            <>
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setDrawerOpen(!drawerOpen)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            </>
          }
          rightChildren={
            <>
              <ProfileIcon />
            </>
          }
        />
        Here is some content
      </Box>
      <Drawer
        variant={mobileMode ? "temporary" : "persistent"}
        open={drawerOpen}
        width={drawerWidth}
        onClose={() => setDrawerOpen(false)}
      >
        <DrawerHeader />
        <Divider />
        <AppMenu />
      </Drawer>
    </>
  );
};

export default MainApp;
