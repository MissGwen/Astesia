import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QueryResult } from '@/types/database';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
} from 'lucide-react';

interface Props {
  connectionId: string;
  database: string;
  collection: string;
}

/** Recursively renders a JSON value with syntax coloring. */
function JsonValue({ value, depth = 0, collapsed: initialCollapsed }: { value: any; depth?: number; collapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed ?? depth > 1);
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-purple-500 dark:text-purple-400">{String(value)}</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-emerald-600 dark:text-emerald-400">"{value}"</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">{'[]'}</span>;
    if (collapsed) {
      return (
        <span>
          <button
            className="inline text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(false)}
          >
            {'['}
            <span className="mx-1 text-xs text-muted-foreground">...{value.length} items</span>
            {']'}
          </button>
        </span>
      );
    }
    return (
      <span>
        <button
          className="inline text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(true)}
        >
          {'['}
        </button>
        {'\n'}
        {value.map((item, i) => (
          <span key={i}>
            {childIndent}
            <JsonValue value={item} depth={depth + 1} />
            {i < value.length - 1 && ','}
            {'\n'}
          </span>
        ))}
        {indent}{']'}
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-muted-foreground">{'{}'}</span>;
    if (collapsed) {
      return (
        <span>
          <button
            className="inline text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(false)}
          >
            {'{'}
            <span className="mx-1 text-xs text-muted-foreground">...{entries.length} fields</span>
            {'}'}
          </button>
        </span>
      );
    }
    return (
      <span>
        <button
          className="inline text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(true)}
        >
          {'{'}
        </button>
        {'\n'}
        {entries.map(([k, v], i) => (
          <span key={k}>
            {childIndent}
            <span className="text-rose-500 dark:text-rose-400">"{k}"</span>
            <span className="text-muted-foreground">{': '}</span>
            <JsonValue value={v} depth={depth + 1} />
            {i < entries.length - 1 && ','}
            {'\n'}
          </span>
        ))}
        {indent}{'}'}
      </span>
    );
  }

  return <span className="text-foreground">{String(value)}</span>;
}

/** A single document card. */
function DocumentCard({ doc, index }: { doc: Record<string, any>; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const docId = doc._id ?? doc.id ?? `#${index}`;
  const idDisplay = typeof docId === 'object' ? JSON.stringify(docId) : String(docId);

  // Build a preview string: first few fields
  const previewEntries = Object.entries(doc)
    .filter(([k]) => k !== '_id')
    .slice(0, 3);
  const previewText = previewEntries
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
    .join(', ');

  return (
    <div
      className="rounded-lg border bg-card p-4 mb-2 transition-colors hover:border-primary/30"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
          _id: {idDisplay}
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>收起</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>展开</span>
            </>
          )}
        </Button>
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <div className="mt-2 font-mono text-xs text-muted-foreground truncate">
          {'{ '}{previewText}{previewEntries.length < Object.keys(doc).length - 1 ? ', ...' : ''}{' }'}
        </div>
      )}

      {/* Expanded JSON view */}
      {expanded && (
        <div className="mt-3 rounded-md border bg-muted/30 p-3 overflow-x-auto">
          <pre className="font-mono text-xs leading-relaxed whitespace-pre">
            <JsonValue value={doc} depth={0} collapsed={false} />
          </pre>
        </div>
      )}
    </div>
  );
}

export default function MongoViewer({ connectionId, database, collection }: Props) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [filter, setFilter] = useState('');
  const [filterInput, setFilterInput] = useState('');
  const pageSize = 50;

  const fetchData = useCallback(async (currentPage: number, currentFilter: string) => {
    setLoading(true);
    setError(null);
    try {
      if (currentFilter.trim()) {
        // Use execute_query with find filter
        const query = `db.${collection}.find(${currentFilter})`;
        const result = await invoke<QueryResult>('execute_query', {
          connectionId,
          database,
          query,
        });
        const docs = result.rows.map((row) => {
          const doc: Record<string, any> = {};
          result.columns.forEach((col, i) => {
            doc[col.name] = row[i];
          });
          return doc;
        });
        setDocuments(docs);
        setColumns(result.columns.map((c) => c.name));
        setTotalRows(docs.length);
      } else {
        // Use get_table_data for normal pagination
        const result = await invoke<QueryResult>('get_table_data', {
          connectionId,
          database,
          table: collection,
          page: currentPage,
          pageSize,
        });
        const docs = result.rows.map((row) => {
          const doc: Record<string, any> = {};
          result.columns.forEach((col, i) => {
            doc[col.name] = row[i];
          });
          return doc;
        });
        setDocuments(docs);
        setColumns(result.columns.map((c) => c.name));
        setTotalRows(result.affected_rows > 0 ? result.affected_rows : docs.length);
      }
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || '加载文档失败');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [connectionId, database, collection]);

  useEffect(() => {
    fetchData(page, filter);
  }, [page, filter, fetchData]);

  const handleRefresh = () => {
    fetchData(page, filter);
  };

  const handleApplyFilter = () => {
    setPage(1);
    setFilter(filterInput);
  };

  const handleClearFilter = () => {
    setFilterInput('');
    setFilter('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className="flex h-full flex-col" onContextMenu={(e) => e.preventDefault()}>
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('mongo.refresh')}
        </Button>

        <div className="mx-2 h-5 w-px bg-border" />

        {/* Filter */}
        <div className="flex items-center gap-1.5">
          <Input
            className="h-8 w-64 font-mono text-xs"
            placeholder={t('mongo.filterPlaceholder')}
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplyFilter();
            }}
          />
          <Button variant="outline" size="sm" className="h-8" onClick={handleApplyFilter}>
            <Search className="h-3.5 w-3.5" />
          </Button>
          {filter && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClearFilter}>
              清除
            </Button>
          )}
        </div>

        <div className="flex-1" />

        {/* Document count */}
        <span className="text-xs text-muted-foreground">
          {t('mongo.documentCount')}: {totalRows}
        </span>

        <div className="mx-2 h-5 w-px bg-border" />

        {/* Pagination */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[60px] text-center text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hint */}
      <div className="shrink-0 border-b bg-muted/20 px-4 py-1.5">
        <span className="text-xs text-muted-foreground">
          {t('mongo.collection')}: <span className="font-mono text-foreground">{collection}</span>
          {' | '}
          在查询编辑器中编辑文档
        </span>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading && documents.length === 0 && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {t('common.loading')}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && documents.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-20" />
              <span className="text-sm">{t('mongo.noDocuments')}</span>
            </div>
          )}

          {documents.map((doc, i) => (
            <DocumentCard key={doc._id ?? i} doc={doc} index={i} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
