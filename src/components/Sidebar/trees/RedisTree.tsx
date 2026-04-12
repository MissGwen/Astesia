import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Eye, Trash2, Plus, Search, Key, RefreshCw } from 'lucide-react';
import type { RedisTreeProps } from './types';

export default function RedisTree({
  conn, node, db, dbKey, expandedKeys, toggleExpand,
  handleViewRedisKey, handleRedisDeleteKey,
  redisKeyFilter, setRedisKeyFilter,
  setRedisAddKeyDialog, loadTables,
}: RedisTreeProps) {
  const { t } = useTranslation();

  const tables = node?.tables?.[db] || [];
  const filter = redisKeyFilter[dbKey] || '';
  const filteredTables = filter
    ? tables.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : tables;

  return (
    <>
      {/* Search + Add Key row */}
      <div className="flex items-center gap-1 pl-14 pr-2.5 py-1">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-6 w-full rounded border bg-background pl-6 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={t('sidebar.keys') + '...'}
            value={redisKeyFilter[dbKey] || ''}
            onChange={(e) => setRedisKeyFilter((prev) => ({ ...prev, [dbKey]: e.target.value }))}
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-sidebar-accent"
              onClick={() => setRedisAddKeyDialog({ connectionId: conn.id, database: db })}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('redis.addKey')}</TooltipContent>
        </Tooltip>
      </div>
      {filteredTables.map((table) => (
        <ContextMenu key={`${dbKey}::key::${table.name}`}>
          <ContextMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-2 rounded-md py-1.5 pl-14 pr-2.5 text-left text-sm transition-colors hover:bg-sidebar-accent"
              onClick={() => handleViewRedisKey(conn.id, db, table.name)}
            >
              <Key className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span className="truncate">{table.name}</span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-44">
            <ContextMenuItem className="gap-2 py-2" onClick={() => handleViewRedisKey(conn.id, db, table.name)}>
              <Eye className="h-4 w-4" /> 查看详情
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="gap-2 py-2 text-destructive focus:text-destructive"
              onClick={() => handleRedisDeleteKey(conn.id, db, table.name)}
            >
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="gap-2 py-2" onClick={() => loadTables(conn.id, db)}>
              <RefreshCw className="h-4 w-4" /> {t('sidebar.refresh')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </>
  );
}
