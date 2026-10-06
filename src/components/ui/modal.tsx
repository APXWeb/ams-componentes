"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { useToast } from "./toast";
import { SubmitButton, FormErrorsContext, PendingContext, useFormAction } from "./form";

type ServerAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      style={wide ? { width: "min(760px, calc(100vw - 32px))" } : undefined}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open ? (
        <>
          <div className="modal__head">
            <div className="stack" style={{ "--gap": "4px" } as React.CSSProperties}>
              <h2 className="modal__title" id="modal-title">
                {title}
              </h2>
              {description ? <p className="small muted">{description}</p> : null}
            </div>
            <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="Fechar" onClick={onClose}>
              <X aria-hidden />
            </button>
          </div>
          {children}
        </>
      ) : null}
    </dialog>
  );
}

/** Botão que abre um modal com formulário ligado a uma Server Action. */
export function ActionModal({
  trigger,
  triggerClass = "btn",
  title,
  description,
  action,
  submitLabel,
  submitClass = "btn",
  children,
  wide,
  hidden,
  autoOpen,
}: {
  autoOpen?: boolean;
  trigger: React.ReactNode;
  triggerClass?: string;
  title: string;
  description?: string;
  action: ServerAction;
  submitLabel: string;
  submitClass?: string;
  children?: React.ReactNode;
  wide?: boolean;
  hidden?: Record<string, string | number>;
}) {
  const [open, setOpen] = useState(!!autoOpen);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      <Modal open={open} onClose={close} title={title} description={description} wide={wide}>
        <ModalForm action={action} onDone={close} submitLabel={submitLabel} submitClass={submitClass} hidden={hidden} onCancel={close}>
          {children}
        </ModalForm>
      </Modal>
    </>
  );
}

function ModalForm({
  action,
  onDone,
  onCancel,
  submitLabel,
  submitClass,
  children,
  hidden,
}: {
  action: ServerAction;
  onDone: () => void;
  onCancel: () => void;
  submitLabel: string;
  submitClass: string;
  children?: React.ReactNode;
  hidden?: Record<string, string | number>;
}) {
  const toast = useToast();
  // sucesso: fecha o modal e avisa; erro: mostrado dentro do próprio modal
  const { state, onSubmit, pending } = useFormAction(action, {
    toast: false,
    onSuccess: (s) => {
      if (s.message) toast(s.message, "success", s.sticky ? 60000 : undefined);
      onDone();
    },
  });
  const errors = state.fieldErrors ?? {};
  return (
    <PendingContext.Provider value={pending}>
    <form onSubmit={onSubmit} noValidate>
      {hidden ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
      <div className="modal__body">
        {!state.ok && state.message ? (
          <div className="notice notice--danger" role="alert">
            {state.message}
          </div>
        ) : null}
        <FormErrorsContext.Provider value={errors}>{children}</FormErrorsContext.Provider>
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--outline" onClick={onCancel}>
          Cancelar
        </button>
        <SubmitButton className={submitClass}>{submitLabel}</SubmitButton>
      </div>
    </form>
    </PendingContext.Provider>
  );
}

/** Formulário inline ligado a uma Server Action, com feedback em toast. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  hidden,
  onSuccess,
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  hidden?: Record<string, string | number>;
  onSuccess?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending } = useFormAction(action, {
    onSuccess: (_, form) => {
      if (resetOnSuccess) form.reset();
      onSuccess?.();
    },
  });
  return (
    <PendingContext.Provider value={pending}>
      <form ref={formRef} onSubmit={onSubmit} className={className} noValidate>
        {hidden ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
        <FormErrorsContext.Provider value={state.fieldErrors ?? {}}>{children}</FormErrorsContext.Provider>
      </form>
    </PendingContext.Provider>
  );
}
