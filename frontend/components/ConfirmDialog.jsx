"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({ trigger, title, description, confirmText = "Confirm", onConfirm, variant = "default" }) {
  const isDanger = variant === "danger";
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        {trigger}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 card p-6 shadow-xl outline-none">
          <Dialog.Title className={`text-lg font-semibold flex items-center gap-2 ${isDanger ? 'text-rose-700 dark:text-rose-400' : ''}`}>
            {isDanger && <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-500" />}
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close className="btn-muted">Cancel</Dialog.Close>
            <Dialog.Close asChild>
              <button className={isDanger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>{confirmText}</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
