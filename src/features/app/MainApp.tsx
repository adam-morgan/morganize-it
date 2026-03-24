import AppBar from "@/components/app-bar/AppBar";
import Drawer from "@/components/drawer/Drawer";
import { useEffectOnMount } from "@/hooks/useEffectOnMount";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

  const showDrawerOffset = !mobileMode && drawerOpen;

  return (
    <>
      <div
        className="flex-1 transition-all duration-225"
        style={{
          width: showDrawerOffset ? `calc(100% - ${drawerWidth})` : "100%",
          marginLeft: showDrawerOffset ? drawerWidth : undefined,
        }}
      >
        <AppBar
          title="Home"
          leftChildren={
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 hover:bg-accent"
              onClick={() => setDrawerOpen(!drawerOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          }
          rightChildren={<ProfileIcon />}
        />
        Here is some content
      </div>
      <Drawer
        variant={mobileMode ? "temporary" : "persistent"}
        open={drawerOpen}
        width={drawerWidth}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="flex h-16 items-center justify-end px-2" />
        <Separator />
        <AppMenu />
      </Drawer>
    </>
  );
};

export default MainApp;
