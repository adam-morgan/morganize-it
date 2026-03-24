import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateNotebook, useNotebooksSlice } from "../../notes";
import { useEffectOnMount } from "@/hooks/useEffectOnMount";

const AppMenu = () => {
  const { initialize, notebooks } = useNotebooksSlice();
  const reactiveQuery = useReactiveQueryWithMask();

  useEffectOnMount(() => reactiveQuery(initialize, "Loading...", () => {}));

  return (
    <nav className="w-full">
      <ul className="py-2">
        <li>
          <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent">Home</button>
        </li>
      </ul>
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Notebooks</span>
          <CreateNotebook
            trigger={(open) => (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={open}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          />
        </div>
      </div>
      <ul>
        {(notebooks ?? []).map((notebook) => (
          <li key={notebook.id}>
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent">
              {notebook.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default AppMenu;
