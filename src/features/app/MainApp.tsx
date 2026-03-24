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
import { NotebookView, NoteRoute, useNotebooksSlice } from "../notes";
import { Routes, Route, useMatch } from "react-router-dom";

const WelcomeView = () => (
  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
    <p className="text-lg">Welcome to Morganize It</p>
    <p className="text-sm">Select a notebook from the sidebar to get started</p>
  </div>
);

const MainApp = () => {
  const { initialize, initialized, drawerOpen, setDrawerOpen } = useMainAppSlice();
  const { notebooks } = useNotebooksSlice();

  const breakpoint = useBreakpoint();

  const mobileMode = breakpoint === "xs";

  const drawerWidth = "240px";

  const notebookMatch = useMatch("/notebooks/:notebookId/*");
  const notebookId = notebookMatch?.params.notebookId ?? null;

  useEffectOnMount(() => {
    initialize(breakpoint);
  });

  if (!initialized) {
    return undefined;
  }

  const showDrawerOffset = !mobileMode && drawerOpen;
  const selectedNotebook = notebooks.find((nb) => nb.id === notebookId);
  const appBarTitle = selectedNotebook ? selectedNotebook.name : "Home";

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
          title={appBarTitle}
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
        <Routes>
          <Route path="/notebooks/:notebookId/notes/:noteId" element={<NoteRoute />} />
          <Route path="/notebooks/:notebookId" element={<NotebookView />} />
          <Route path="*" element={<WelcomeView />} />
        </Routes>
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
