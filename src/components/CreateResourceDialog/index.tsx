import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useCreateResourceStore, type ResourceType } from '@/stores/createResourceStore';
import CreateDatabaseForm from './forms/CreateDatabaseForm';
import CreateSchemaForm from './forms/CreateSchemaForm';
import CreateTableForm from './forms/CreateTableForm';
import CreateViewForm from './forms/CreateViewForm';
import CreateFunctionForm from './forms/CreateFunctionForm';
import CreateUserForm from './forms/CreateUserForm';

const titleKeys: Record<ResourceType, string> = {
  database: 'create.database',
  schema: 'create.schema',
  table: 'create.table',
  view: 'create.view',
  function: 'create.function',
  procedure: 'create.procedure',
  trigger: 'create.trigger',
  user: 'create.user',
};

export default function CreateResourceDialog() {
  const { t } = useTranslation();
  const { open, resourceType, connectionId, database, schema, dbType, closeDialog } = useCreateResourceStore();

  const handleSuccess = () => {
    closeDialog();
  };

  const renderForm = () => {
    if (!connectionId) return null;

    switch (resourceType) {
      case 'database':
        return <CreateDatabaseForm connectionId={connectionId} onSuccess={handleSuccess} />;
      case 'schema':
        return <CreateSchemaForm connectionId={connectionId} database={database} onSuccess={handleSuccess} />;
      case 'table':
        return <CreateTableForm connectionId={connectionId} database={database} schema={schema} dbType={dbType} onSuccess={handleSuccess} />;
      case 'view':
        return <CreateViewForm connectionId={connectionId} database={database} schema={schema} onSuccess={handleSuccess} />;
      case 'function':
        return <CreateFunctionForm connectionId={connectionId} database={database} schema={schema} onSuccess={handleSuccess} />;
      case 'procedure':
        return <CreateFunctionForm connectionId={connectionId} database={database} schema={schema} onSuccess={handleSuccess} isProcedure />;
      case 'trigger':
        // Trigger reuses function form with procedure mode for simplicity
        return <CreateFunctionForm connectionId={connectionId} database={database} schema={schema} onSuccess={handleSuccess} />;
      case 'user':
        return <CreateUserForm connectionId={connectionId} database={database} onSuccess={handleSuccess} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t(titleKeys[resourceType])}</DialogTitle>
          <DialogDescription>
            {database && `${database}${schema ? ` / ${schema}` : ''}`}
          </DialogDescription>
        </DialogHeader>
        {renderForm()}
      </DialogContent>
    </Dialog>
  );
}
