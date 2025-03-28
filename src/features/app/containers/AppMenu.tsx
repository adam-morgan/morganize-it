import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
} from "@mui/material";
import { CreateNotebook, useNotebooksSlice } from "../../notes";
import { useEffectOnMount } from "@/hooks/useEffectOnMount";

const AppMenu = () => {
  const { initialize, notebooks } = useNotebooksSlice();
  const reactiveQuery = useReactiveQueryWithMask();

  useEffectOnMount(() => reactiveQuery(initialize, "Loading...", () => {}));

  return (
    <>
      <List sx={{ width: "100%" }} component="nav">
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
      </List>
      <List
        sx={{ width: "100%" }}
        component="nav"
        subheader={
          <ListSubheader component="div" sx={{ bgcolor: "unset" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <ListItemText primary="Notebooks" />
              <CreateNotebook
                trigger={(open) => (
                  <IconButton onClick={open}>
                    <AddIcon />
                  </IconButton>
                )}
              />
            </Box>
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
    </>
  );
};

export default AppMenu;
