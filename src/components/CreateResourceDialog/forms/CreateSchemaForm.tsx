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
  onSuccess: () => void;
}

export default function CreateSchemaForm({ connectionId, database, onSuccess }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const sql = `CREATE SCHEMA "${name.trim()}"`;
      await invoke('execute_query', { connectionId, database, sql });
      notify.success(t('create.success'), `CREATE SCHEMA "${name.trim()}"`);
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
          placeholder={t('create.schema')}
          autoFocus
        />
      </div>
      <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('common.confirm')}
      </Button>
    </div>
  );
}
