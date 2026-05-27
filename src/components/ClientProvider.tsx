'use client';

import { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { ToastProvider } from './ToastProvider';

export default function ClientProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </I18nextProvider>
  );
}
