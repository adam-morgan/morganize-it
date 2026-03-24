import { CircleUser } from "lucide-react";
import { Avatar as ShadAvatar, AvatarFallback } from "@/components/ui/avatar";

type AvatarProps = {
  user: User;
  onClick?: () => void;
};

const Avatar = ({ user, onClick }: AvatarProps) => {
  if ((user as GuestUser).isGuest || !user.name) {
    return <CircleUser className="h-6 w-6" />;
  }

  const parts = user.name.trim().split(/\s+/);
  let letters: string;

  if (parts.length === 1) {
    letters = parts[0].substring(0, 1);
  } else {
    letters = parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1);
  }

  return (
    <ShadAvatar className="cursor-pointer" onClick={onClick}>
      <AvatarFallback>{letters.toUpperCase()}</AvatarFallback>
    </ShadAvatar>
  );
};

export default Avatar;
