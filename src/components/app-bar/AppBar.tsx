type AppBarProps = {
  title: string;
  leftChildren?: React.ReactNode;
  rightChildren?: React.ReactNode;
};

const AppBar = (props: AppBarProps) => {
  return (
    <header className="sticky top-0 z-40 bg-card text-card-foreground shadow-md border-b border-border transition-all duration-225">
      <div className="flex h-16 items-center px-4">
        {props.leftChildren}
        <h1 className="flex-1 text-lg font-semibold">{props.title}</h1>
        {props.rightChildren}
      </div>
    </header>
  );
};

export default AppBar;
