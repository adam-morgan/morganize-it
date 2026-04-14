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
  /** For notes, the parent notebook id. Helps clients update IDB caches. */
  notebookId?: string;
  /** Hint for soft-deletes. */
  deletedAt?: string | null;
  action?: RealtimeAction;
};
