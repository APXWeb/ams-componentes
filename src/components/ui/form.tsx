"use client";

import { useFormStatus } from "react-dom";
import { createContext, useContext, useId, useRef, useState, useTransition } from "react";
import { initialState, type ActionState } from "@/lib/action";
import { FileUp, FileCheck2 } from "lucide-react";
import { fmtBytes } from "@/lib/format";
import { useToast } from "./toast";

/** Estado de envio quando o formulário usa onSubmit (sem reset automático do React). */
export const PendingContext = createContext(false);

/**
 * Liga um formulário a uma Server Action:
 * - não usa o reset automático do React 19, preservando o que foi digitado quando a validação falha;
 * - mostra o aviso assim que o servidor responde, mesmo que a ação remova o próprio formulário da tela
 *   (ex.: o botão "Enviar" some depois do upload). O provedor de avisos vive na raiz da aplicação.
 */
export function useFormAction(
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>,
  opts: { toast?: boolean; onSuccess?: (s: ActionState, form: HTMLFormElement) => void } = {},
) {
  const [state, setState] = useState<ActionState>(initialState);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const prev = useRef(state);
  const { toast: showToast = true, onSuccess } = opts;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(form, submitter);
    startTransition(async () => {
      const res = await action(prev.current, fd);
      // redirect() no servidor navega e não devolve resultado
      if (!res) return;
      prev.current = res;
      setState(res);
      if (showToast && res.message) toast(res.message, res.ok ? "success" : "error", res.sticky ? 60000 : undefined);
      if (res.ok) onSuccess?.(res, form);
    });
  };
  return { state, onSubmit, pending };
}

/** Erros de validação do último envio, disponíveis para os campos do formulário. */
export const FormErrorsContext = createContext<Record<string, string>>({});
const useFieldError = (name: string) => useContext(FormErrorsContext)[name];

type Common = { label: string; name: string; hint?: string; optional?: boolean; className?: string };

export function TextField({
  label,
  name,
  hint,
  optional,
  className,
  ...input
}: Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  const error = useFieldError(name);
  return (
    <Field label={label} name={name} error={error} hint={hint} optional={optional} className={className}>
      <input className="input" required={!optional} {...input} {...fieldA11y(name, error, hint)} />
    </Field>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  optional,
  className,
  ...input
}: Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  const error = useFieldError(name);
  return (
    <Field label={label} name={name} error={error} hint={hint} optional={optional} className={className}>
      <textarea className="textarea" required={!optional} {...input} {...fieldA11y(name, error, hint)} />
    </Field>
  );
}

export function SelectField({
  label,
  name,
  hint,
  optional,
  className,
  options,
  placeholder,
  ...input
}: Common & { options: { value: string | number; label: string }[]; placeholder?: string } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  const error = useFieldError(name);
  return (
    <Field label={label} name={name} error={error} hint={hint} optional={optional} className={className}>
      <select className="select" required={!optional} {...input} {...fieldA11y(name, error, hint)}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SubmitButton({
  children,
  className = "btn",
  pendingLabel,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = status.pending || ctxPending;
  return (
    <button {...rest} type="submit" className={`${className} ${pending ? "is-loading" : ""}`} aria-busy={pending} disabled={pending || rest.disabled}>
      {children}
      {pending && pendingLabel ? <span className="sr-only">{pendingLabel}</span> : null}
    </button>
  );
}

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children?: React.ReactNode;
};

/** Campo com rótulo, dica e erro ligados por aria-describedby. */
export function Field({ label, name, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={`field ${className ?? ""}`}>
      <label className="label" htmlFor={name}>
        {label} {optional ? <span className="opt">(opcional)</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <span className="hint" id={`${name}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="field-error" id={`${name}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function fieldA11y(name: string, error?: string, hint?: string) {
  return {
    id: name,
    name,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${name}-error` : hint ? `${name}-hint` : undefined,
  };
}

export function FileDrop({
  name,
  accept,
  label,
  help,
  required,
  error,
}: {
  name: string;
  accept: string;
  label: string;
  help: string;
  required?: boolean;
  error?: string;
}) {
  const ctxError = useFieldError(name);
  const err = error ?? ctxError;
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const id = useId();
  return (
    <div className="field">
      <span className="label" id={`${id}-l`}>
        {label}
      </span>
      <div className={`drop ${over ? "is-over" : ""} ${file ? "has-file" : ""}`} onDragEnter={() => setOver(true)} onDragLeave={() => setOver(false)} onDrop={() => setOver(false)}>
        {file ? <FileCheck2 aria-hidden /> : <FileUp aria-hidden />}
        {file ? (
          <span>
            <strong>{file.name}</strong> · {fmtBytes(file.size)}
            <br />
            <span className="xsmall">Clique para trocar o arquivo</span>
          </span>
        ) : (
          <span>
            <strong>Selecione</strong> ou arraste o arquivo aqui
            <br />
            <span className="xsmall">{help}</span>
          </span>
        )}
        <input
          type="file"
          id={name}
          name={name}
          accept={accept}
          required={required}
          aria-labelledby={`${id}-l`}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${name}-error` : undefined}
          onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
        />
      </div>
      {err ? (
        <span className="field-error" id={`${name}-error`} role="alert">
          {err}
        </span>
      ) : null}
    </div>
  );
}
