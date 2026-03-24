import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { take } from "rxjs";
import { useNotesSlice } from "../notesSlice";
import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import NoteEditor from "./NoteEditor";

const NoteRoute = () => {
  const { notebookId, noteId } = useParams<{ notebookId: string; noteId: string }>();
  const navigate = useNavigate();
  const { notes, loadNotes, markNoteOpened } = useNotesSlice();
  const reactiveQuery = useReactiveQueryWithMask();
  const [loading, setLoading] = useState(!notes[notebookId!]?.length);

  useEffect(() => {
    if (!notebookId) return;

    if (!notes[notebookId]) {
      reactiveQuery(() => loadNotes(notebookId), "Loading notes...", () => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    if (noteId && notebookId) {
      markNoteOpened(noteId, notebookId).pipe(take(1)).subscribe();
    }
  }, [noteId, notebookId]);

  if (loading) return null;

  const note = (notes[notebookId!] ?? []).find((n) => n.id === noteId);
  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg">Note not found</p>
      </div>
    );
  }

  return <NoteEditor key={note.id} note={note} onBack={() => navigate(`/notebooks/${notebookId}`)} />;
};

export default NoteRoute;
