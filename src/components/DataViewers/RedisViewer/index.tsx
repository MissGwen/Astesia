import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Save, Plus, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { confirm } from '@/stores/confirmStore';

interface Props {
  connectionId: string;
  database: string;
  keyName: string;
}

interface KeyData {
  type: string;
  value: string;
  ttl: number;
}

const TYPE_COLORS: Record<string, string> = {
  string: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  hash: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  list: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  set: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  zset: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const TYPE_LABELS: Record<string, string> = {
  string: '字符串',
  hash: '哈希',
  list: '列表',
  set: '集合',
  zset: '有序集合',
};

export default function RedisViewer({ connectionId, database, keyName }: Props) {
  const { t } = useTranslation();
  const [keyData, setKeyData] = useState<KeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // String value editing
  const [editValue, setEditValue] = useState('');
  const [editTTL, setEditTTL] = useState('');
  const [saving, setSaving] = useState(false);

  // Hash fields
  const [hashFields, setHashFields] = useState<Array<{ field: string; value: string }>>([]);
  const [newHashField, setNewHashField] = useState('');
  const [newHashValue, setNewHashValue] = useState('');

  // List items
  const [listItems, setListItems] = useState<string[]>([]);
  const [newListItem, setNewListItem] = useState('');

  // Set members
  const [setMembers, setSetMembers] = useState<string[]>([]);
  const [newSetMember, setNewSetMember] = useState('');

  // Zset members
  const [zsetMembers, setZsetMembers] = useState<Array<{ member: string; score: string }>>([]);
  const [newZsetMember, setNewZsetMember] = useState('');
  const [newZsetScore, setNewZsetScore] = useState('');

  const fetchKeyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: any = await invoke('get_table_data', {
        connectionId,
        database,
        table: keyName,
        page: 1,
        pageSize: 1,
      });

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        const cols = result.columns.map((c: any) => c.name);
        const keyIdx = cols.indexOf('key');
        const valueIdx = cols.indexOf('value');
        const typeIdx = cols.indexOf('type');
        const ttlIdx = cols.indexOf('ttl');

        const keyType = typeIdx >= 0 ? String(row[typeIdx]) : 'string';
        const rawValue = valueIdx >= 0 ? String(row[valueIdx]) : '';
        const ttl = ttlIdx >= 0 ? Number(row[ttlIdx]) : -1;

        setKeyData({ type: keyType, value: rawValue, ttl });

        // Parse data based on type
        if (keyType === 'string') {
          setEditValue(rawValue);
          setEditTTL(ttl > 0 ? String(ttl) : '');
        } else if (keyType === 'hash') {
          parseHashValue(rawValue);
        } else if (keyType === 'list') {
          parseListValue(rawValue);
        } else if (keyType === 'set') {
          parseSetValue(rawValue);
        } else if (keyType === 'zset') {
          parseZsetValue(rawValue);
        }
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [connectionId, database, keyName]);

  const parseHashValue = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        setHashFields(Object.entries(parsed).map(([field, value]) => ({ field, value: String(value) })));
      }
    } catch {
      setHashFields([{ field: '', value: raw }]);
    }
  };

  const parseListValue = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setListItems(parsed.map(String));
      }
    } catch {
      setListItems([raw]);
    }
  };

  const parseSetValue = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSetMembers(parsed.map(String));
      }
    } catch {
      setSetMembers([raw]);
    }
  };

  const parseZsetValue = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setZsetMembers(parsed.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            return { member: String(item.member || item.value || ''), score: String(item.score || '0') };
          }
          return { member: String(item), score: '0' };
        }));
      }
    } catch {
      setZsetMembers([]);
    }
  };

  useEffect(() => {
    fetchKeyData();
  }, [fetchKeyData]);

  const executeCommand = async (cmd: string) => {
    await invoke('execute_query', { connectionId, database, command: cmd });
  };

  // String: save value
  const handleSaveString = async () => {
    setSaving(true);
    try {
      const ttlVal = editTTL ? parseInt(editTTL) : undefined;
      await invoke('redis_set_key', {
        connectionId,
        database,
        key: keyName,
        value: editValue,
        ttl: ttlVal && ttlVal > 0 ? ttlVal : null,
      });
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Hash: add field
  const handleAddHashField = async () => {
    if (!newHashField.trim()) return;
    try {
      await executeCommand(`HSET ${keyName} ${newHashField} ${newHashValue}`);
      setNewHashField('');
      setNewHashValue('');
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    }
  };

  // Hash: delete field
  const handleDeleteHashField = async (field: string) => {
    try {
      await executeCommand(`HDEL ${keyName} ${field}`);
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    }
  };

  // List: push item
  const handleAddListItem = async (direction: 'left' | 'right') => {
    if (!newListItem.trim()) return;
    try {
      const cmd = direction === 'left' ? 'LPUSH' : 'RPUSH';
      await executeCommand(`${cmd} ${keyName} ${newListItem}`);
      setNewListItem('');
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    }
  };

  // List: remove item
  const handleRemoveListItem = async (value: string) => {
    try {
      await executeCommand(`LREM ${keyName} 1 ${value}`);
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    }
  };

  // Set: add member
  const handleAddSetMember = async () => {
    if (!newSetMember.trim()) return;
    try {
      await executeCommand(`SADD ${keyName} ${newSetMember}`);
      setNewSetMember('');
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    }
  };

  // Set: remove member
  const handleRemoveSetMember = async (member: string) => {
    try {
      await executeCommand(`SREM ${keyName} ${member}`);
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    }
  };

  // Zset: add member
  const handleAddZsetMember = async () => {
    if (!newZsetMember.trim()) return;
    try {
      await executeCommand(`ZADD ${keyName} ${newZsetScore || '0'} ${newZsetMember}`);
      setNewZsetMember('');
      setNewZsetScore('');
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    }
  };

  // Zset: remove member
  const handleRemoveZsetMember = async (member: string) => {
    try {
      await executeCommand(`ZREM ${keyName} ${member}`);
      await fetchKeyData();
    } catch (err: any) {
      setError(String(err));
    }
  };

  // Delete key
  const handleDeleteKey = async () => {
    const ok = await confirm(t('redis.deleteKey'), t('redis.confirmDelete'));
    if (!ok) return;
    try {
      await invoke('redis_delete_key', { connectionId, database, key: keyName });
    } catch (err: any) {
      setError(String(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground" onContextMenu={(e) => e.preventDefault()}>
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  if (error && !keyData) {
    return (
      <div className="flex h-full items-center justify-center text-destructive" onContextMenu={(e) => e.preventDefault()}>
        <p>{error}</p>
      </div>
    );
  }

  const keyType = keyData?.type || 'string';

  return (
    <div className="flex h-full flex-col overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-mono text-sm font-semibold truncate">{keyName}</span>
          <Badge className={cn('shrink-0', TYPE_COLORS[keyType] || '')}>
            {TYPE_LABELS[keyType] || keyType}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            <span>
              {keyData && keyData.ttl > 0
                ? `TTL: ${keyData.ttl}s`
                : t('redis.noTTL')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchKeyData}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            {t('sidebar.refresh')}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteKey}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            {t('redis.deleteKey')}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="shrink-0 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* String type */}
        {keyType === 'string' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('redis.value')}</label>
              <textarea
                className="w-full min-h-[200px] rounded-md border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="w-48">
                <label className="mb-1 block text-sm font-medium">{t('redis.ttl')}</label>
                <Input
                  type="number"
                  placeholder={t('redis.noTTL')}
                  value={editTTL}
                  onChange={(e) => setEditTTL(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveString} disabled={saving}>
                <Save className="mr-1 h-3.5 w-3.5" />
                {t('redis.save')}
              </Button>
            </div>
          </div>
        )}

        {/* Hash type */}
        {keyType === 'hash' && (
          <div className="flex flex-col gap-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">{t('redis.field')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('redis.value')}</th>
                  <th className="px-3 py-2 text-right font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {hashFields.map((item, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 font-mono">{item.field}</td>
                    <td className="px-3 py-2 font-mono max-w-md truncate">{item.value}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteHashField(item.field)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium">{t('redis.field')}</label>
                <Input value={newHashField} onChange={(e) => setNewHashField(e.target.value)} placeholder={t('redis.field')} />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium">{t('redis.value')}</label>
                <Input value={newHashValue} onChange={(e) => setNewHashValue(e.target.value)} placeholder={t('redis.value')} />
              </div>
              <Button size="sm" onClick={handleAddHashField}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t('redis.addField')}
              </Button>
            </div>
          </div>
        )}

        {/* List type */}
        {keyType === 'list' && (
          <div className="flex flex-col gap-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium w-16">{t('redis.index')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('redis.value')}</th>
                  <th className="px-3 py-2 text-right font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {listItems.map((item, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 text-muted-foreground">{i}</td>
                    <td className="px-3 py-2 font-mono max-w-md truncate">{item}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveListItem(item)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium">{t('redis.value')}</label>
                <Input value={newListItem} onChange={(e) => setNewListItem(e.target.value)} placeholder={t('redis.value')} />
              </div>
              <Button size="sm" variant="outline" onClick={() => handleAddListItem('left')}>
                LPUSH
              </Button>
              <Button size="sm" onClick={() => handleAddListItem('right')}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                RPUSH
              </Button>
            </div>
          </div>
        )}

        {/* Set type */}
        {keyType === 'set' && (
          <div className="flex flex-col gap-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">{t('redis.member')}</th>
                  <th className="px-3 py-2 text-right font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {setMembers.map((member, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 font-mono">{member}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveSetMember(member)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium">{t('redis.member')}</label>
                <Input value={newSetMember} onChange={(e) => setNewSetMember(e.target.value)} placeholder={t('redis.member')} />
              </div>
              <Button size="sm" onClick={handleAddSetMember}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t('redis.addMember')}
              </Button>
            </div>
          </div>
        )}

        {/* Zset type */}
        {keyType === 'zset' && (
          <div className="flex flex-col gap-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">{t('redis.member')}</th>
                  <th className="px-3 py-2 text-left font-medium w-32">{t('redis.score')}</th>
                  <th className="px-3 py-2 text-right font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {zsetMembers.map((item, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 font-mono">{item.member}</td>
                    <td className="px-3 py-2 font-mono">{item.score}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveZsetMember(item.member)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium">{t('redis.member')}</label>
                <Input value={newZsetMember} onChange={(e) => setNewZsetMember(e.target.value)} placeholder={t('redis.member')} />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-xs font-medium">{t('redis.score')}</label>
                <Input type="number" value={newZsetScore} onChange={(e) => setNewZsetScore(e.target.value)} placeholder="0" />
              </div>
              <Button size="sm" onClick={handleAddZsetMember}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t('redis.addMember')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
