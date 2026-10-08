"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Send } from "lucide-react";
import { FormErrorsContext, PendingContext, SubmitButton, TextField, TextAreaField, SelectField, FileDrop, useFormAction } from "@/components/ui/form";
import { sendContact, applyToVacancy } from "@/lib/demo/actions/site";
import { ACCEPT_RESUME } from "@/lib/demo/actions/util";
import { EDUCATION_LEVELS, EXPERIENCE_LEVELS } from "@/lib/demo/types";

/*
 * Formulários públicos em modo demonstração: a validação é a mesma de um envio real, o envio é
 * simulado e nada sai do navegador. Ver src/lib/demo/actions/site.ts.
 */

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

function Success({ title, children, onReset, resetLabel = "Enviar outra mensagem" }: { title: string; children: React.ReactNode; onReset?: () => void; resetLabel?: string }) {
  return (
    <div className="success-state" role="status">
      <span className="success-state__icon">
        <Check aria-hidden />
      </span>
      <h2 style={{ fontSize: "var(--fs-xl)" }}>{title}</h2>
      <div className="muted">{children}</div>
      {onReset ? (
        <button type="button" className="btn btn--outline" onClick={onReset} style={{ marginTop: 6 }}>
          {resetLabel}
        </button>
      ) : null}
    </div>
  );
}

/** Etapas mostradas enquanto o envio simulado acontece. */
function Sending({ steps }: { steps: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 520);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="sending" role="status" aria-live="polite">
      <span className="sending__bar" aria-hidden>
        <i style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
      </span>
      <span className="sending__text">{steps[i]}</span>
    </div>
  );
}

const SUBJECTS = ["Compras e distribuidores", "Indústria", "Exportação", "Representação comercial", "Outros assuntos"];

export function ContactForm({ product }: { product?: string }) {
  const [round, setRound] = useState(0);
  return <ContactFormInner key={round} product={product} onReset={() => setRound((r) => r + 1)} />;
}

function ContactFormInner({ product, onReset }: { product?: string; onReset: () => void }) {
  const { state, onSubmit, pending } = useFormAction(sendContact, { toast: false });
  if (state.ok) {
    return (
      <Success title="Mensagem enviada" onReset={onReset}>
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
          <TextAreaField label="Mensagem" name="message" className="full" rows={5} defaultValue={product ? `Gostaria de informações sobre o produto: ${product}.\n\n` : undefined} />
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
            {pending ? <Sending steps={["Validando os dados…", "Enviando a mensagem…", "Quase lá…"]} /> : null}
            <SubmitButton className="btn btn--lg">
              <Send aria-hidden /> {pending ? "Enviando…" : "Enviar mensagem"}
            </SubmitButton>
          </div>
        </FormErrorsContext.Provider>
      </form>
    </PendingContext.Provider>
  );
}

/** Máscara simples de telefone: (11) 90000-0000. */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function ApplyForm({ vacancyId, vacancies }: { vacancyId: number; vacancies: { id: number; title: string }[] }) {
  const [round, setRound] = useState(0);
  return <ApplyFormInner key={round} vacancyId={vacancyId} vacancies={vacancies} onReset={() => setRound((r) => r + 1)} />;
}

function ApplyFormInner({ vacancyId, vacancies, onReset }: { vacancyId: number; vacancies: { id: number; title: string }[]; onReset: () => void }) {
  const { state, onSubmit, pending } = useFormAction(applyToVacancy, { toast: false });
  const [phone, setPhone] = useState("");
  const [chosen, setChosen] = useState(vacancyId);
  const [msg, setMsg] = useState("");
  if (state.ok) {
    const title = vacancies.find((v) => v.id === chosen)?.title;
    return (
      <Success title="Currículo enviado com sucesso." onReset={onReset} resetLabel="Enviar outra candidatura">
        <p>
          Obrigado pelo interesse em trabalhar na AMS. Sua candidatura para <strong>{title}</strong> foi registrada e segue para a triagem do RH. Se o seu perfil avançar, entraremos em contato pelo e-mail ou telefone informados.
        </p>
        <div className="demo-trail">
          <span className="demo-flag">Demonstração</span>
          <p className="small">Nada foi enviado de verdade. A candidatura entrou no quadro de recrutamento do RH desta demonstração, na coluna Candidato.</p>
          <Link href={`/rh/recrutamento?vaga=${chosen}`} className="btn btn--outline btn--sm">
            Ver a candidatura no RH <ArrowRight className="btn__arrow" aria-hidden />
          </Link>
        </div>
        <p style={{ marginTop: 12 }}>
          <Link href="/trabalhe-conosco#vagas" className="link">
            Ver outras vagas
          </Link>
        </p>
      </Success>
    );
  }
  const errors = state.fieldErrors ?? {};
  return (
    <PendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} noValidate className="stack apply-form" style={{ position: "relative", "--gap": "16px" } as React.CSSProperties} aria-busy={pending}>
        <FormErrorsContext.Provider value={errors}>
          <Honeypot />
          {state.message && !state.ok ? (
            <div className="notice notice--danger" role="alert">
              {state.message}
            </div>
          ) : null}
          <SelectField label="Vaga" name="vacancyId" options={vacancies.map((v) => ({ value: v.id, label: v.title }))} value={chosen} onChange={(e) => setChosen(Number(e.target.value))} />
          <TextField label="Nome completo" name="name" autoComplete="name" />
          <div className="form-grid">
            <TextField label="E-mail" name="email" type="email" autoComplete="email" />
            <TextField label="Telefone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(11) 90000-0000" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
            <TextField label="Cidade" name="city" autoComplete="address-level2" placeholder="Ex.: Cotia" />
            <TextField label="LinkedIn" name="linkedin" optional placeholder="linkedin.com/in/seu-nome" autoComplete="url" />
            <SelectField label="Formação" name="education" placeholder="Selecione" options={EDUCATION_LEVELS.map((v) => ({ value: v, label: v }))} defaultValue="" />
            <SelectField label="Experiência na área" name="experience" placeholder="Selecione" options={EXPERIENCE_LEVELS.map((v) => ({ value: v, label: v }))} defaultValue="" />
          </div>
          <FileDrop name="resume" accept={ACCEPT_RESUME} label="Currículo" help="PDF ou DOCX, até 8 MB" required />
          <div className="field">
            <TextAreaField label="Mensagem" name="message" optional rows={4} maxLength={2000} placeholder="Conte em poucas linhas por que esta vaga combina com você." value={msg} onChange={(e) => setMsg(e.target.value)} />
            <span className="xsmall subtle" style={{ textAlign: "right" }} aria-live="polite">
              {msg.length}/2000
            </span>
          </div>
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
          {pending ? <Sending steps={["Validando os dados…", "Enviando o currículo…", "Registrando a candidatura…", "Quase lá…"]} /> : null}
          <SubmitButton className="btn btn--signal btn--lg btn--block" pendingLabel="Enviando candidatura">
            {pending ? "Enviando candidatura…" : "Enviar candidatura"}
          </SubmitButton>
        </FormErrorsContext.Provider>
      </form>
    </PendingContext.Provider>
  );
}

/** Formulário de contato com o produto de ?produto= já citado na mensagem. */
export function ContactFormFromUrl({ products }: { products: Record<string, string> }) {
  const slug = useSearchParams().get("produto") ?? "";
  return <ContactForm key={slug} product={products[slug]} />;
}
