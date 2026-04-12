import { useTranslation } from 'react-i18next';
import { Table2, ChevronRight, ChevronDown } from 'lucide-react';
import type { MongoTreeProps } from './types';

export default function MongoTree({
  conn, node, db, dbKey, expandedKeys, toggleExpand,
  addTab, loadTables,
}: MongoTreeProps) {
  const { t } = useTranslation();

  const tables = node?.tables?.[db] || [];
  const collectionsKey = `${dbKey}::tables`;
  const collectionsExpanded = expandedKeys.has(collectionsKey);

  return (
    <>
      <button
        className="flex w-full items-center gap-2 rounded-md py-1 pl-14 pr-2.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent"
        onClick={() => {
          toggleExpand(collectionsKey);
          if (!collectionsExpanded) loadTables(conn.id, db);
        }}
      >
        {collectionsExpanded
          ? <ChevronDown className="h-2.5 w-2.5 shrink-0" />
          : <ChevronRight className="h-2.5 w-2.5 shrink-0" />
        }
        <Table2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span>{t('sidebar.collections')} ({tables.length})</span>
      </button>
      {collectionsExpanded && tables.map((table) => (
        <button
          key={`${dbKey}::collection::${table.name}`}
          className="flex w-full items-center gap-2 rounded-md py-1.5 pl-20 pr-2.5 text-left text-sm transition-colors hover:bg-sidebar-accent"
          onClick={() => addTab({
            key: `mongo-${conn.id}-${db}-${table.name}`,
            label: table.name,
            type: 'mongo-viewer',
            connectionId: conn.id,
            database: db,
            table: table.name,
          })}
        >
          <Table2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span className="truncate">{table.name}</span>
        </button>
      ))}
    </>
  );
}
