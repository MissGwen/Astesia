import type { languages } from 'monaco-editor';

// Dialect-specific keywords
const MYSQL_KEYWORDS = ['SHOW', 'DATABASES', 'TABLES', 'DESCRIBE', 'EXPLAIN', 'USE', 'ENGINE', 'AUTO_INCREMENT', 'CHARSET', 'COLLATE', 'IFNULL', 'LIMIT', 'OFFSET', 'REGEXP', 'BINARY', 'UNSIGNED', 'ZEROFILL', 'ENUM', 'SET', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'DATETIME', 'TIMESTAMP', 'YEAR', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB', 'JSON'];

const POSTGRES_KEYWORDS = ['RETURNING', 'ILIKE', 'SIMILAR', 'ARRAY', 'JSONB', 'HSTORE', 'SERIAL', 'BIGSERIAL', 'SMALLSERIAL', 'BYTEA', 'UUID', 'INET', 'CIDR', 'MACADDR', 'MONEY', 'INTERVAL', 'TSQUERY', 'TSVECTOR', 'REGCLASS', 'LATERAL', 'MATERIALIZED', 'REFRESH', 'EXTENSION', 'SCHEMA', 'CONCURRENTLY', 'VACUUM', 'ANALYZE', 'REINDEX', 'CLUSTER', 'NOTIFY', 'LISTEN', 'UNLISTEN', 'COPY', 'EXCLUDE', 'PARTITION', 'INHERIT', 'RULE'];

const SQLITE_KEYWORDS = ['PRAGMA', 'AUTOINCREMENT', 'GLOB', 'VACUUM', 'ATTACH', 'DETACH', 'REINDEX', 'INDEXED', 'CONFLICT', 'ABORT', 'FAIL', 'IGNORE', 'REPLACE', 'ROLLBACK', 'DEFERRED', 'IMMEDIATE', 'EXCLUSIVE', 'TEMP', 'WITHOUT', 'ROWID'];

const SQLSERVER_KEYWORDS = ['TOP', 'NOLOCK', 'IDENTITY', 'NVARCHAR', 'NCHAR', 'NTEXT', 'UNIQUEIDENTIFIER', 'BIT', 'MONEY', 'SMALLMONEY', 'IMAGE', 'DATETIMEOFFSET', 'DATETIME2', 'SMALLDATETIME', 'HIERARCHYID', 'SQL_VARIANT', 'XML', 'GEOGRAPHY', 'GEOMETRY', 'ROWGUIDCOL', 'MERGE', 'OUTPUT', 'CROSS', 'APPLY', 'OUTER', 'PIVOT', 'UNPIVOT', 'TRY', 'CATCH', 'THROW', 'RAISERROR', 'PRINT', 'EXEC', 'EXECUTE', 'PROC', 'PROCEDURE', 'TRIGGER', 'CURSOR', 'FETCH', 'OPEN', 'CLOSE', 'DEALLOCATE'];

export type SqlDialect = 'mysql' | 'postgresql' | 'sqlite' | 'sqlserver' | 'mongodb' | 'redis';

export function getDialectKeywords(dialect: SqlDialect): string[] {
  switch (dialect) {
    case 'mysql': return MYSQL_KEYWORDS;
    case 'postgresql': return POSTGRES_KEYWORDS;
    case 'sqlite': return SQLITE_KEYWORDS;
    case 'sqlserver': return SQLSERVER_KEYWORDS;
    default: return [];
  }
}

const registeredDialects = new Set<string>();

// --- Database-aware autocompletion ---

export interface TableCompletionData {
  tables: Array<{ name: string; schema?: string; columns: Array<{ name: string; type: string }> }>;
}

let dbCompletionDisposable: any = null;

export function registerDatabaseCompletions(
  monaco: typeof import('monaco-editor'),
  data: TableCompletionData,
  dbType: string,
) {
  // Dispose previous registration to avoid duplicates
  if (dbCompletionDisposable) {
    dbCompletionDisposable.dispose();
    dbCompletionDisposable = null;
  }

  dbCompletionDisposable = monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Check if the user typed a table name followed by "."
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);
      const dotMatch = textBeforeCursor.match(/(\w+)\.$/);

      if (dotMatch) {
        // After a dot — suggest columns for that table
        const tableName = dotMatch[1].toLowerCase();
        const table = data.tables.find(t =>
          t.name.toLowerCase() === tableName ||
          (t.schema && `${t.schema}.${t.name}`.toLowerCase() === tableName)
        );
        if (table) {
          return {
            suggestions: table.columns.map(col => ({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.name,
              detail: col.type,
              range,
            })),
          };
        }

        // Could also be a schema name — suggest tables in that schema
        const schemaName = dotMatch[1].toLowerCase();
        const schemaTables = data.tables.filter(t => t.schema?.toLowerCase() === schemaName);
        if (schemaTables.length > 0) {
          return {
            suggestions: schemaTables.map(t => ({
              label: t.name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: t.name,
              detail: `${t.schema}.${t.name}`,
              range,
            })),
          };
        }
      }

      // Default — suggest table names (and schema names for PG)
      const suggestions: any[] = [];

      // Add table names
      data.tables.forEach(t => {
        suggestions.push({
          label: t.schema ? `${t.schema}.${t.name}` : t.name,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: t.schema && dbType === 'postgresql' ? `"${t.schema}"."${t.name}"` : t.name,
          detail: 'table',
          range,
        });
        // Also add just the table name for convenience
        if (t.schema) {
          suggestions.push({
            label: t.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: t.name,
            detail: `${t.schema}.${t.name}`,
            range,
          });
        }
      });

      // Add schema names for PG
      const schemas = [...new Set(data.tables.map(t => t.schema).filter(Boolean))];
      schemas.forEach(s => {
        suggestions.push({
          label: s!,
          kind: monaco.languages.CompletionItemKind.Module,
          insertText: s!,
          detail: 'schema',
          range,
        });
      });

      // Add all column names as general suggestions
      const seenColumns = new Set<string>();
      data.tables.forEach(t => {
        t.columns.forEach(col => {
          if (!seenColumns.has(col.name)) {
            seenColumns.add(col.name);
            suggestions.push({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.name,
              detail: `column (${col.type})`,
              range,
              sortText: '1_' + col.name, // Sort after tables
            });
          }
        });
      });

      return { suggestions };
    },
  });
}

export function clearDatabaseCompletions() {
  if (dbCompletionDisposable) {
    dbCompletionDisposable.dispose();
    dbCompletionDisposable = null;
  }
}

// --- Dialect keyword completion ---

export function configureMonacoForDialect(
  monaco: typeof import('monaco-editor'),
  dialect: SqlDialect
) {
  const key = `sql-${dialect}`;
  if (registeredDialects.has(key)) return;
  registeredDialects.add(key);

  const keywords = getDialectKeywords(dialect);
  if (keywords.length === 0) return;

  monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: languages.CompletionItem[] = keywords.map((kw) => ({
        label: kw,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: kw,
        range,
        detail: `${dialect.toUpperCase()} keyword`,
      }));

      return { suggestions };
    },
  });
}
