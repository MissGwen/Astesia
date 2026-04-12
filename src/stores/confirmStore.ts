import { create } from 'zustand';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: 'default' | 'destructive';
  resolve: ((value: boolean) => void) | null;
  showConfirm: (options: { title: string; message: string; variant?: 'default' | 'destructive' }) => Promise<boolean>;
  close: (result: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: '',
  message: '',
  variant: 'default',
  resolve: null,

  showConfirm: ({ title, message, variant = 'default' }) => {
    return new Promise<boolean>((resolve) => {
      set({ open: true, title, message, variant, resolve });
    });
  },

  close: (result) => {
    const { resolve } = get();
    resolve?.(result);
    set({ open: false, resolve: null });
  },
}));

/** Convenience function callable from anywhere */
export const confirm = (title: string, message: string, variant: 'default' | 'destructive' = 'destructive') =>
  useConfirmStore.getState().showConfirm({ title, message, variant });
