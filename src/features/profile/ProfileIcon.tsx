import Avatar from "@/components/avatar/Avatar";
import WithMenu from "@/components/menu/WithMenu";
import { useNavigate } from "react-router";
import { useAuthSlice } from "../auth";

type ProfileIconProps = {
  withMenu?: boolean;
};

const ProfileIcon = ({ withMenu = true }: ProfileIconProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthSlice();

  const ele = <Avatar user={user as User} />;

  if (withMenu) {
    const menuItems = [];

    if ((user as GuestUser).isGuest) {
      menuItems.push({
        label: "Sign In",
        onClick: () => navigate("/login"),
      });
    } else {
      menuItems.push({
        label: "Logout",
        onClick: () => {
          logout()
            .pipe()
            .subscribe(() => navigate("/login"));
        },
      });
    }

    return <WithMenu items={menuItems}>{ele}</WithMenu>;
  }

  return ele;
};

export default ProfileIcon;
