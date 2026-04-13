import { useRef, useState } from "react";
import Avatar from "@/components/avatar/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router";
import { useAuthSlice } from "../auth";
import { useThemeSlice } from "../theme/themeSlice";
import { useMaskSlice, useAlertSlice } from "../app";
import { useNotebooksSlice } from "../notes/notebooksSlice";
import { exportData, importData } from "../notes/services/export-service";
import { take } from "rxjs";

type ProfileIconProps = {
  withMenu?: boolean;
};

const ProfileIcon = ({ withMenu = true }: ProfileIconProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthSlice();
  const { mode, setPaletteMode } = useThemeSlice();
  const { mask } = useMaskSlice();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const ele = <Avatar user={user as User} />;

  const handleExport = () => {
    const unmask = mask("Exporting data...");
    exportData()
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          useAlertSlice.getState().successAlert("Data exported successfully");
        },
        error: () => {
          unmask();
          useAlertSlice.getState().errorAlert("Failed to export data");
        },
      });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const unmask = mask("Importing data...");
    importData(file)
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          useAlertSlice.getState().successAlert(
            `Imported ${result.notebooks} notebooks and ${result.notes} notes`
          );
          useNotebooksSlice.getState().reset();
          useNotebooksSlice.getState().initialize()
            .pipe(take(1))
            .subscribe({
              complete: () => unmask(),
              error: () => unmask(),
            });
        },
        error: (err) => {
          unmask();
          useAlertSlice.getState().errorAlert(
            `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        },
      });

    // Reset file input so the same file can be re-selected
    e.target.value = "";
  };

  const handleLogout = () => {
    logout().subscribe({
      complete: () => navigate("/login"),
      error: () => navigate("/login"),
    });
  };

  if (!withMenu) {
    return ele;
  }

  const isGuest = (user as GuestUser).isGuest;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer">{ele}</div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Appearance</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuCheckboxItem
                checked={mode === "dark"}
                onClick={() => setPaletteMode("dark")}
              >
                Dark
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={mode === "light"}
                onClick={() => setPaletteMode("light")}
              >
                Light
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {isGuest ? (
            <DropdownMenuItem onClick={() => navigate("/login")}>
              Sign In
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Import/Export</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    Import Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    Export Data
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />
    </>
  );
};

export default ProfileIcon;
