// pages/DataManager/logic/useDataManager.ts
import { useMemo, useReducer } from "react";
import { initialState, reducer } from "./reducer";
import type { InferredType } from "@/lib/google-sheets/infer";
import type { GroupConfig } from "@/lib/google-sheets/grouping";
import {
  cmdLoadPreview,
  cmdOverrideColumnType,
  cmdRefreshFromSheets,
  cmdSaveToDataset,
  cmdListSpreadsheets,
  cmdGetSheetTabs,
} from "./reducer";

export function useDataManager() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(() => {
    return {
      // Source
      setSource(partial: Partial<typeof state.source>) {
        dispatch({ type: "SET_SOURCE", payload: partial });
      },

      // Load / Sync / Save
      async loadPreview() {
        await cmdLoadPreview(state, dispatch);
      },
      async refreshFromSheets(preserve?: string[]) {
        await cmdRefreshFromSheets(state, dispatch, preserve);
      },
      async saveToDataset() {
        return await cmdSaveToDataset(state, dispatch);
      },

      // Grouping
      setGrouping(enabled: boolean, config: GroupConfig | null) {
        dispatch({ type: "SET_GROUPING", enabled, config });
      },
      rebuildGroupView() {
        dispatch({ type: "REBUILD_GROUP_VIEW" });
      },

      // Edits
      setCell(id: string, field: string, value: unknown) {
        dispatch({ type: "SET_CELL", id, field, value });
      },
      removeRows(ids: string[]) {
        dispatch({ type: "REMOVE_ROWS", ids });
      },
      removeColumns(columns: string[]) {
        dispatch({ type: "REMOVE_COLUMNS", columns });
      },
      overrideColumnType(columnName: string, inferredType: InferredType) {
        return cmdOverrideColumnType(state, dispatch, columnName, inferredType);
      },

      // Pickers (Google API)
      listSpreadsheets: cmdListSpreadsheets,
      getSheetTabs: cmdGetSheetTabs,
    };
  }, [state]);

  return { state, actions };
}
