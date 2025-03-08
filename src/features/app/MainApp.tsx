import AppBar from "@/components/app-bar/AppBar";
import { ProfileIcon } from "../profile";

const MainApp = () => {
  return (
    <AppBar
      title="Home"
      rightChildren={
        <>
          <ProfileIcon />
        </>
      }
    />
  );
};

export default MainApp;
