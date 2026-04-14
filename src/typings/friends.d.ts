type FriendshipStatus = "pending" | "accepted";

interface Friendship extends Entity {
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

interface Friend {
  friendshipId: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

interface FriendRequest {
  friendshipId: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}
