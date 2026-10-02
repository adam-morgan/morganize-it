interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
}

interface Notebook extends UserEntity {
  name: string;
  updatedAt: string;
  deletedAt?: string | null;
  archivedAt?: string | null;
}

interface Note extends UserEntity {
  notebookId: string;
  title: string;
  content: string;
  textContent: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  tags?: string[];
  attachments?: Attachment[];
  deletedAt?: string | null;
  archivedAt?: string | null;
}

interface SyncNotebook extends Notebook {
  accessLevel: ShareAccessLevel;
  ownerName?: string;
  ownerEmail?: string;
  shareId?: string;
}

interface SyncNote extends Note {
  accessLevel: ShareAccessLevel;
  ownerName?: string;
  ownerEmail?: string;
  parentNotebookName?: string;
  shareId?: string;
}

interface SyncResponse {
  notebooks: SyncNotebook[];
  notes: SyncNote[];
}
