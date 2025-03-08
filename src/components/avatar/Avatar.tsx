import { AccountCircle } from "@mui/icons-material";
import { Avatar as MuiAvatar } from "@mui/material";

type AvatarProps = {
  user: User;
  onClick?: () => void;
};

const Avatar = ({ user, onClick }: AvatarProps) => {
  if ((user as GuestUser).isGuest || !user.name) {
    return <AccountCircle />;
  }

  const parts = user.name.trim().split(/\s+/);
  let letters: string;

  if (parts.length === 1) {
    letters = parts[0].substring(0, 1);
  } else {
    letters = parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1);
  }

  return (
    <MuiAvatar sx={{ bgcolor: (style) => style.palette.text.secondary }} onClick={onClick}>
      {letters.toUpperCase()}
    </MuiAvatar>
  );
};

export default Avatar;
