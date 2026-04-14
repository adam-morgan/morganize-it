export type RealtimeResourceType =
  | "notebook"
  | "note"
  | "share"
  | "friendship"
  | "friend-request";

export type RealtimeAction =
  | "created"
  | "updated"
  | "deleted"
  | "accepted"
  | "declined";

export type RealtimeEvent = {
  type: "resource.changed";
  resourceType: RealtimeResourceType;
  resourceId: string;
  notebookId?: string;
  deletedAt?: string | null;
  action?: RealtimeAction;
};
