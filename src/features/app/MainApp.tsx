import AppBar from "@/components/app-bar/AppBar";
import BrandLogo from "@/components/brand/BrandLogo";
import Drawer from "@/components/drawer/Drawer";
import { useAppSync } from "@/hooks/useAppSync";
import { useEffectOnMount } from "@/hooks/useEffectOnMount";
import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import { useState, useEffect } from "react";
import { Menu, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProfileIcon } from "../profile";
import { useBreakpoint } from "../theme";
import AppMenu from "./containers/AppMenu";
import { useMainAppSlice } from "./mainAppSlice";
import { NotebookView, NoteRoute, useNotebooksSlice } from "../notes";
import TagView from "../notes/containers/TagView";
import TrashView from "../notes/containers/TrashView";
import RecentNotes from "../notes/containers/RecentNotes";
import GlobalSearchDialog from "../notes/search/GlobalSearchDialog";
import { Routes, Route, Link, useMatch } from "react-router-dom";

const WelcomeView = () => (
  <div className="flex flex-col items-center justify-center py-10">
    <BrandLogo size="lg" layout="column" className="mb-4" />
    <p className="text-sm text-muted-foreground">
      Select a notebook from the sidebar to get started
    </p>
    <div className="mt-12 w-full max-w-4xl px-6">
      <RecentNotes />
    </div>
  </div>
);

const MainApp = () => {
  const { initialize, initialized, drawerOpen, setDrawerOpen } = useMainAppSlice();
  const {
    initialize: initializeNotebooks,
    initialized: notebooksReady,
    notebooks,
  } = useNotebooksSlice();
  const reactiveQuery = useReactiveQueryWithMask();
  const [searchOpen, setSearchOpen] = useState(false);
  const [enableTransitions, setEnableTransitions] = useState(false);

  const breakpoint = useBreakpoint();

  const mobileMode = breakpoint === "xs";

  const drawerWidth = "240px";

  const notebookMatch = useMatch("/notebooks/:notebookId/*");
  const notebookId = notebookMatch?.params.notebookId ?? null;
  const tagMatch = useMatch("/tags/:tagName");
  const tagName = tagMatch?.params.tagName ? decodeURIComponent(tagMatch.params.tagName) : null;
  const trashMatch = useMatch("/trash");

  useAppSync();

  useEffectOnMount(() => {
    initialize(breakpoint);
    reactiveQuery(initializeNotebooks, "Loading...", () => {});
  });

  useEffect(() => {
    if (notebooksReady) {
      const id = requestAnimationFrame(() => setEnableTransitions(true));
      return () => cancelAnimationFrame(id);
    }
  }, [notebooksReady]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!initialized || !notebooksReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showDrawerOffset = !mobileMode && drawerOpen;
  const selectedNotebook = notebooks.find((nb) => nb.id === notebookId);
  const appBarTitle = trashMatch
    ? "Trash"
    : tagName
      ? `Tag: ${tagName}`
      : selectedNotebook
        ? selectedNotebook.name
        : "Home";

  return (
    <>
      <div
        className={`flex-1 ${enableTransitions ? "transition-all duration-225" : ""}`}
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
          rightChildren={
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
              <ProfileIcon />
            </div>
          }
        />
        <Routes>
          <Route path="/notebooks/:notebookId/notes/:noteId" element={<NoteRoute />} />
          <Route path="/notebooks/:notebookId" element={<NotebookView />} />
          <Route path="/tags/:tagName" element={<TagView />} />
          <Route path="/trash" element={<TrashView />} />
          <Route path="*" element={<WelcomeView />} />
        </Routes>
      </div>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <Drawer
        variant={mobileMode ? "temporary" : "persistent"}
        open={drawerOpen}
        animate={enableTransitions}
        width={drawerWidth}
        onClose={() => setDrawerOpen(false)}
      >
        <Link to="/" className="flex h-16 items-center px-3">
          <BrandLogo size="sm" />
        </Link>
        <Separator />
        <AppMenu />
      </Drawer>
    </>
  );
};

export default MainApp;
