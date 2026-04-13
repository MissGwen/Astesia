import { create } from 'zustand';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateStore {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  progress: number;
  contentLength: number;
  downloaded: number;
  update: Update | null;
  dialogOpen: boolean;
  error: string | null;

  checkForUpdates: (silent?: boolean) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  skipVersion: () => void;
  dismiss: () => void;
}

const SKIPPED_VERSION_KEY = 'astesia_skipped_version';

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  checking: false,
  available: false,
  downloading: false,
  progress: 0,
  contentLength: 0,
  downloaded: 0,
  update: null,
  dialogOpen: false,
  error: null,

  checkForUpdates: async (silent = true) => {
    if (get().checking || get().downloading) return;

    set({ checking: true, error: null });

    try {
      const update = await check();

      if (update?.available) {
        const skippedVersion = localStorage.getItem(SKIPPED_VERSION_KEY);
        if (silent && skippedVersion === update.version) {
          set({ checking: false });
          return;
        }

        set({
          checking: false,
          available: true,
          update,
          dialogOpen: true,
        });
      } else {
        set({ checking: false, available: false });
      }
    } catch (e) {
      console.error('Update check failed:', e);
      set({
        checking: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  downloadAndInstall: async () => {
    const update = get().update;
    if (!update) return;

    set({ downloading: true, progress: 0, downloaded: 0, contentLength: 0 });

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          set({ contentLength: event.data.contentLength ?? 0 });
        } else if (event.event === 'Progress') {
          const newDownloaded = get().downloaded + event.data.chunkLength;
          const total = get().contentLength;
          set({
            downloaded: newDownloaded,
            progress: total > 0 ? Math.round((newDownloaded / total) * 100) : 0,
          });
        } else if (event.event === 'Finished') {
          set({ progress: 100 });
        }
      });

      await relaunch();
    } catch (e) {
      console.error('Update download/install failed:', e);
      set({
        downloading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  skipVersion: () => {
    const update = get().update;
    if (update) {
      localStorage.setItem(SKIPPED_VERSION_KEY, update.version);
    }
    set({ dialogOpen: false, available: false, update: null });
  },

  dismiss: () => {
    set({ dialogOpen: false });
  },
}));
