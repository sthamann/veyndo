/** Ephemeral design navigation survives route remounts without putting reference URLs in browser storage or another identity. */
import { useState } from "react";
type Reference = { workspace: string; environment?: string; url: string };
export function useDesignHandoff(workspace: string, credential: string) {
  const [value, setValue] = useState<{
    workspace: string;
    credential: string;
    reference?: Reference;
  }>();
  return {
    designReference:
      value?.workspace === workspace && value.credential === credential
        ? value.reference
        : undefined,
    setDesignReference: (reference?: Reference) =>
      setValue({ workspace, credential, reference }),
  };
}
