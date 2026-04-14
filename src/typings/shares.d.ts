type ShareResourceType = "notebook" | "note";
type SharePermission = "read" | "readwrite";
type ShareAccessLevel = "owner" | "readwrite" | "read" | "none";

interface Share extends Entity {
  resourceType: ShareResourceType;
  resourceId: string;
  ownerId: string;
  sharedWithUserId: string;
  permission: SharePermission;
  notebookId: string;
  createdAt: string;
  updatedAt: string;
}

interface ShareWithUser extends Share {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface SharedNotebook extends Notebook {
  permission: SharePermission;
  ownerName: string;
  ownerEmail: string;
  /** ID of the share record, so the recipient can leave the share. */
  shareId: string;
}

interface SharedNote extends Note {
  permission: SharePermission;
  ownerName: string;
  ownerEmail: string;
  /**
   * The notebook this note belongs to. Always populated so the recipient's
   * sidebar can display the note nested under its parent notebook.
   */
  parentNotebookName: string;
  /** ID of the share record, so the recipient can leave the share. */
  shareId: string;
}
