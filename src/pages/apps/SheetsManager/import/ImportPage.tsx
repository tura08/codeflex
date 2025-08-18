// src/pages/apps/SheetsManager/import/ImportPage.tsx
import TopActionsImport from "../components/TopActions.Import";
import { ImportActionsProvider } from "./ImportActionsContext";
import Workbench from "./Workbench";

export default function ImportPage() {
  return (
    <ImportActionsProvider>
      <TopActionsImport />
      <Workbench />
    </ImportActionsProvider>
  );
}
