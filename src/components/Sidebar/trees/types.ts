import type { Dispatch, SetStateAction } from 'react';
import { ConnectionConfig, DbType } from '@/types/database';

export interface TreeNode {
  connectionId: string;
  databases: string[];
  schemas: Record<string, string[]>;
  tables: Record<string, { name: string; schema?: string }[]>;
  views: Record<string, { name: string }[]>;
  functions: Record<string, { name: string }[]>;
  procedures: Record<string, { name: string }[]>;
  triggers: Record<string, { name: string; event: string; table: string; timing: string }[]>;
  users: { name: string; host?: string }[];
  expanded: Set<string>;
  connected: boolean;
}

export interface DatabaseTreeProps {
  conn: ConnectionConfig;
  node: TreeNode;
  db: string;
  dbKey: string;
  expandedKeys: Set<string>;
  toggleExpand: (key: string) => void;
}

export interface SqlDatabaseTreeProps extends DatabaseTreeProps {
  handleViewData: (connectionId: string, database: string, table: string) => void;
  handleViewStructure: (connectionId: string, database: string, table: string) => void;
  handleViewChart: (connectionId: string, database: string, table: string) => void;
  handleOpenObjectDef: (connectionId: string, database: string, objectName: string, objectType: 'view' | 'function' | 'procedure') => void;
  handleOpenQuery: (connectionId: string, database: string) => void;
  loadTables: (connectionId: string, database: string) => Promise<void>;
  loadViews: (connectionId: string, database: string) => Promise<void>;
  loadFunctions: (connectionId: string, database: string) => Promise<void>;
  loadProcedures: (connectionId: string, database: string) => Promise<void>;
  loadTriggers: (connectionId: string, database: string) => Promise<void>;
  clipboardStore: {
    copiedTable: { connectionId: string; database: string; tableName: string; dbType: DbType } | null;
    copyTable: (data: { connectionId: string; database: string; tableName: string; dbType: DbType }) => void;
  };
}

export interface PostgresTreeProps extends SqlDatabaseTreeProps {
  loadSchemas: (connectionId: string, database: string) => Promise<void>;
  handleOpenERDiagram: (connectionId: string, database: string, schema?: string) => void;
}

export interface RedisTreeProps extends DatabaseTreeProps {
  handleViewRedisKey: (connectionId: string, database: string, keyName: string) => void;
  handleRedisDeleteKey: (connectionId: string, database: string, keyName: string) => void;
  redisKeyFilter: Record<string, string>;
  setRedisKeyFilter: Dispatch<SetStateAction<Record<string, string>>>;
  setRedisAddKeyDialog: (value: { connectionId: string; database: string } | null) => void;
  loadTables: (connectionId: string, database: string) => Promise<void>;
}

export interface MongoTreeProps extends DatabaseTreeProps {
  addTab: (tab: any) => void;
  loadTables: (connectionId: string, database: string) => Promise<void>;
}
