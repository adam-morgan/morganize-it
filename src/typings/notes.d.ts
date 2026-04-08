interface Notebook extends UserEntity {
  name: string;
  updatedAt: string;
  deletedAt?: string | null;
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
  deletedAt?: string | null;
}
