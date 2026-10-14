import { createContext, useContext } from "react";

export const WorkspaceContext = createContext(null);

export function useCrm() {
  return useContext(WorkspaceContext);
}
