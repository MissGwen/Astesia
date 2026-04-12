import { create } from 'zustand';

export type ResourceType = 'database' | 'schema' | 'table' | 'view' | 'function' | 'procedure' | 'trigger' | 'user';

interface CreateResourceState {
  open: boolean;
  resourceType: ResourceType;
  connectionId: string;
  database: string;
  schema?: string;
  dbType?: string;
  openDialog: (type: ResourceType, connectionId: string, database: string, schema?: string, dbType?: string) => void;
  closeDialog: () => void;
}

export const useCreateResourceStore = create<CreateResourceState>((set) => ({
  open: false,
  resourceType: 'database',
  connectionId: '',
  database: '',
  schema: undefined,
  dbType: undefined,

  openDialog: (type, connectionId, database, schema, dbType) =>
    set({
      open: true,
      resourceType: type,
      connectionId,
      database,
      schema,
      dbType,
    }),

  closeDialog: () =>
    set({
      open: false,
    }),
}));
