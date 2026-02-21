import { useToggle } from '@/hooks/use-toggle';

export function useDialog() {
  const {
    value: isDialogOpen,
    toggle: toggleDialog,
    setTrue: openDialog,
    setFalse: closeDialog,
  } = useToggle(false);

  return {
    isOpen: isDialogOpen,
    openDialog,
    closeDialog,
    toggleDialog,
  };
}
