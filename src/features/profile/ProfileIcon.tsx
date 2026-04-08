import { useRef } from "react";
import Avatar from "@/components/avatar/Avatar";
import WithMenu from "@/components/menu/WithMenu";
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
  const { mode, toggleMode } = useThemeSlice();
  const { mask } = useMaskSlice();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  if (withMenu) {
    const menuItems = [];

    menuItems.push({
      label: mode === "dark" ? "Light Mode" : "Dark Mode",
      onClick: toggleMode,
    });

    if ((user as GuestUser).isGuest) {
      menuItems.push({
        label: "Sign In",
        onClick: () => navigate("/login"),
      });
    } else {
      menuItems.push({
        label: "Export Data",
        onClick: handleExport,
      });

      menuItems.push({
        label: "Import Data",
        onClick: () => fileInputRef.current?.click(),
      });

      menuItems.push({
        label: "Logout",
        onClick: () => {
          logout().subscribe({
            complete: () => navigate("/login"),
            error: () => navigate("/login"),
          });
        },
      });
    }

    return (
      <>
        <WithMenu items={menuItems}>{ele}</WithMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
      </>
    );
  }

  return ele;
};

export default ProfileIcon;
