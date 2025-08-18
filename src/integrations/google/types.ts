import type { SimpleType } from "@/lib/google/infer";

// Canonical mapping type shared across app
export type Mapping = {
  map_from: string;
  name: string;
  type: SimpleType;
};
