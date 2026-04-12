import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { notify } from '@/stores/notificationStore';

interface Props {
  connectionId: string;
  database: string;
  schema?: string;
  onSuccess: () => void;
}

export default function CreateViewForm({ connectionId, database, schema, onSuccess }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !definition.trim()) return;
    setLoading(true);
    try {
      const qualifiedName = schema ? `"${schema}"."${name.trim()}"` : `"${name.trim()}"`;
      const sql = `CREATE VIEW ${qualifiedName} AS\n${definition.trim()}`;
      await invoke('execute_query', { connectionId, database, sql });
      notify.success(t('create.success'), `CREATE VIEW ${qualifiedName}`);
      onSuccess();
    } catch (e) {
      notify.error(t('create.failed'), String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label className="mb-1.5 block">{t('create.name')}</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('create.view')}
          autoFocus
        />
      </div>
      <div>
        <Label className="mb-1.5 block">{t('create.definition')}</Label>
        <textarea
          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="SELECT * FROM ..."
        />
      </div>
      <Button onClick={handleSubmit} disabled={loading || !name.trim() || !definition.trim()}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('common.confirm')}
      </Button>
    </div>
  );
}
