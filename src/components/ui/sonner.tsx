import React from 'react';
import { Toaster as SonnerToaster, ToasterProps } from 'sonner';

export const Toaster: React.FC<ToasterProps> = ({
  duration = 1000,
  toastOptions,
  ...props
}) => {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      duration={duration}
      richColors
      closeButton
      toastOptions={{
        duration,
        className:
          '!bg-[#181a1d] !text-slate-100 !border !border-[#2d3239] !shadow-2xl font-sans rounded-xl p-3.5 gap-2',
        descriptionClassName: '!text-slate-300 font-mono text-[11px] leading-relaxed break-all',
        actionButtonStyle: {
          backgroundColor: '#6366f1',
          color: '#ffffff',
        },
        ...toastOptions,
      }}
      {...props}
    />
  );
};
