interface Notebook extends UserEntity {
  name: string;
}

interface Note extends UserEntity {
  notebookId: string;
  title: string;
  content: string;
  textContent: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}
