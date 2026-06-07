'use client';

import { useState, useCallback } from 'react';
import { ConfirmModal, ConfirmModalProps } from '@/components/ui/ConfirmModal';

interface UseConfirmReturn {
  confirm: (props: Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm'>) => Promise<boolean>;
  ConfirmModalComponent: () => React.ReactElement;
}

export function useConfirm(): UseConfirmReturn {
  const [state, setState] = useState<{
    isOpen: boolean;
    props: Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    resolve: (value: boolean) => void;
  }>({
    isOpen: false,
    props: {
      title: '',
      message: '',
    },
    resolve: () => {},
  });

  const confirm = useCallback((props: Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm'>) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        props,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
    setTimeout(() => {
      state.resolve(false);
    }, 200);
  }, [state.resolve]);

  const handleConfirm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
    setTimeout(() => {
      state.resolve(true);
    }, 200);
  }, [state.resolve]);

  const ConfirmModalComponent = useCallback(() => {
    return (
      <ConfirmModal
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.props.title}
        message={state.props.message}
        confirmText={state.props.confirmText}
        cancelText={state.props.cancelText}
        variant={state.props.variant}
        icon={state.props.icon}
      />
    );
  }, [state.isOpen, state.props, handleClose, handleConfirm]);

  return {
    confirm,
    ConfirmModalComponent,
  };
}
