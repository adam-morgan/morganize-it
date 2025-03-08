import { AppBar as MuiAppBar, Toolbar, Typography } from "@mui/material";

type AppBarProps = {
  title: string;
  leftChildren?: React.ReactNode;
  rightChildren?: React.ReactNode;
};

const AppBar = (props: AppBarProps) => {
  return (
    <MuiAppBar position="static">
      <Toolbar>
        {props.leftChildren}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {props.title}
        </Typography>
        {props.rightChildren}
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;
