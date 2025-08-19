// src/lib/google/types.ts
  export type SimpleType = 'string' | 'number' | 'boolean' | 'date';
  export type Mapping = { map_from: string; name: string; type: SimpleType };
  export type Issue = { row: number; column: number; level: 'warning'|'error'; message: string; };
  export type QualityStats = { rows: number; columns: number; cells: number; errors: number; warnings: number };
