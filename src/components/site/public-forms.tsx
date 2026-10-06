"use client";

import Link from "next/link";
import { Check, Send } from "lucide-react";
import { FormErrorsContext, PendingContext, SubmitButton, TextField, TextAreaField, SelectField, FileDrop, useFormAction } from "@/components/ui/form";
import { sendContact, applyToVacancy } from "@/app/(site)/actions";

function Honeypot() {
  return (
    <div aria-hidden style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Não preencha este campo
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

function Success({ title, children, onReset }: { title: string; children: React.ReactNode; onReset?: () => void }) {
  return (
    <div className="success-state" role="status">
      <span className="success-state__icon">
        <Check aria-hidden />
      </span>
      <h2 style={{ fontSize: "var(--fs-xl)" }}>{title}</h2>
      <div className="muted">{children}</div>
      {onReset ? (
        <button type="button" className="btn btn--outline" onClick={onReset} style={{ marginTop: 6 }}>
          Enviar outra mensagem
        </button>
      ) : null}
    </div>
  );
}

const SUBJECTS = ["Compras e distribuidores", "Indústria", "Exportação", "Representação comercial", "Outros assuntos"];

export function ContactForm({ product }: { product?: string }) {
  const { state, onSubmit, pending } = useFormAction(sendContact, { toast: false });
  if (state.ok) {
    return (
      <Success title="Mensagem enviada">
        <p>{state.message}</p>
      </Success>
    );
  }
  const errors = state.fieldErrors ?? {};
  return (
    <PendingContext.Provider value={pending}>
    <form onSubmit={onSubmit} noValidate className="form-grid" style={{ position: "relative" }}>
      <FormErrorsContext.Provider value={errors}>
        <Honeypot />
        {state.message && !state.ok ? (
          <div className="notice notice--danger full" role="alert">
            {state.message}
          </div>
        ) : null}
        <TextField label="Nome" name="name" autoComplete="name" />
        <TextField label="E-mail" name="email" type="email" autoComplete="email" />
        <TextField label="Telefone" name="phone" type="tel" autoComplete="tel" optional inputMode="tel" placeholder="(11) 90000-0000" />
        <TextField label="Cidade" name="city" autoComplete="address-level2" optional />
        <SelectField label="Assunto" name="subject" className="full" placeholder="Selecione" options={SUBJECTS.map((s) => ({ value: s, label: s }))} defaultValue="" />
        <TextAreaField
          label="Mensagem"
          name="message"
          className="full"
          rows={5}
          defaultValue={product ? `Gostaria de informações sobre o produto: ${product}.\n\n` : undefined}
        />
        <label className="check full">
          <input type="checkbox" name="consent" required />
          <span>
            Concordo que a AMS use estes dados para responder ao meu contato, conforme a{" "}
            <Link href="/privacidade" className="link">
              política de privacidade
            </Link>
            .{errors.consent ? <span className="field-error" style={{ display: "block" }}>{errors.consent}</span> : null}
          </span>
        </label>
        <div className="full">
          <SubmitButton className="btn btn--lg">
            <Send aria-hidden /> Enviar mensagem
          </SubmitButton>
        </div>
      </FormErrorsContext.Provider>
    </form>
    </PendingContext.Provider>
  );
}

export function ApplyForm({ vacancyId, vacancyTitle }: { vacancyId: number; vacancyTitle: string }) {
  const { state, onSubmit, pending } = useFormAction(applyToVacancy, { toast: false });
  if (state.ok) {
    return (
      <Success title="Candidatura recebida">
        <p>
          Obrigado pelo interesse em trabalhar na AMS. Seu currículo para <strong>{vacancyTitle}</strong> já está com o nosso RH. Se o seu perfil avançar, entraremos em contato pelo e-mail ou telefone informados.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link href="/trabalhe-conosco" className="link">
            Ver outras vagas
          </Link>
        </p>
      </Success>
    );
  }
  const errors = state.fieldErrors ?? {};
  return (
    <PendingContext.Provider value={pending}>
    <form onSubmit={onSubmit} noValidate className="stack" style={{ position: "relative", "--gap": "16px" } as React.CSSProperties}>
      <FormErrorsContext.Provider value={errors}>
        <Honeypot />
        <input type="hidden" name="vacancyId" value={vacancyId} />
        {state.message && !state.ok ? (
          <div className="notice notice--danger" role="alert">
            {state.message}
          </div>
        ) : null}
        <TextField label="Nome completo" name="name" autoComplete="name" />
        <TextField label="E-mail" name="email" type="email" autoComplete="email" />
        <div className="form-grid">
          <TextField label="Telefone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(11) 90000-0000" />
          <TextField label="Cidade" name="city" autoComplete="address-level2" />
        </div>
        <FileDrop name="resume" accept=".pdf,.docx" label="Currículo" help="PDF ou DOCX, até 8 MB" required />
        <TextAreaField label="Mensagem" name="message" optional rows={4} placeholder="Conte em poucas linhas por que esta vaga combina com você." />
        <label className="check">
          <input type="checkbox" name="consent" required />
          <span>
            Autorizo a AMS a tratar meus dados e currículo para este processo seletivo, por até 12 meses, conforme a{" "}
            <Link href="/privacidade#candidatos" className="link" target="_blank">
              política de privacidade
            </Link>
            .{errors.consent ? <span className="field-error" style={{ display: "block" }}>{errors.consent}</span> : null}
          </span>
        </label>
        <SubmitButton className="btn btn--signal btn--lg btn--block" pendingLabel="Enviando candidatura">
          Quero me candidatar
        </SubmitButton>
      </FormErrorsContext.Provider>
    </form>
    </PendingContext.Provider>
  );
}
