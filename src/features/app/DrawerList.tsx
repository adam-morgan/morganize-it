import { List, ListItem, ListItemButton, ListItemText, ListSubheader } from "@mui/material";
import { useNotebooksSlice } from "../notes/notebooksSlice";
import { useEffectOnMount } from "@/hooks/useEffectOnMount";

const DrawerList = () => {
  const { initialize, notebooks } = useNotebooksSlice();

  useEffectOnMount(() => {
    initialize();
  });

  return (
    <List
      sx={{ width: "100%" }}
      component="nav"
      subheader={
        <ListSubheader component="div" sx={{ bgcolor: "unset" }}>
          Notebooks
        </ListSubheader>
      }
    >
      {(notebooks ?? []).map((notebook) => (
        <ListItem key={notebook.id} disablePadding>
          <ListItemButton>
            <ListItemText primary={notebook.name} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};

export default DrawerList;
