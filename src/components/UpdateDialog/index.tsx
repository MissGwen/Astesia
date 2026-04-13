import { useTranslation } from 'react-i18next';
import { useUpdateStore } from '@/stores/updateStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, SkipForward, Clock } from 'lucide-react';
import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useState } from 'react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function UpdateDialog() {
  const { t } = useTranslation();
  const {
    dialogOpen,
    downloading,
    progress,
    contentLength,
    downloaded,
    update,
    error,
    downloadAndInstall,
    skipVersion,
    dismiss,
  } = useUpdateStore();

  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    getVersion().then(setCurrentVersion);
  }, []);

  if (!update) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !downloading) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('update.title')}</DialogTitle>
          <DialogDescription>
            {currentVersion && (
              <span className="block mt-1">
                {t('update.currentVersion')}: <span className="font-mono">{currentVersion}</span>
              </span>
            )}
            <span className="block mt-1">
              {t('update.latestVersion')}: <span className="font-mono">{update.version}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {update.body && (
          <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
            {update.body}
          </div>
        )}

        {downloading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('update.downloading')}</span>
              <span>
                {contentLength > 0
                  ? `${formatBytes(downloaded)} / ${formatBytes(contentLength)}`
                  : `${progress}%`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!downloading && (
            <>
              <Button variant="ghost" size="sm" onClick={skipVersion}>
                <SkipForward className="mr-1 h-4 w-4" />
                {t('update.skipVersion')}
              </Button>
              <Button variant="outline" size="sm" onClick={dismiss}>
                <Clock className="mr-1 h-4 w-4" />
                {t('update.remindLater')}
              </Button>
            </>
          )}
          <Button
            size="sm"
            onClick={downloadAndInstall}
            disabled={downloading}
          >
            <Download className="mr-1 h-4 w-4" />
            {downloading ? t('update.installing') : t('update.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
