"use client";

import { useState } from "react";
import { Eye, FileText, Printer } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/bits";
import { useDemoData } from "@/lib/demo/store";
import { fileUrl } from "@/lib/demo/actions/util";
import { candidate as candOf, dept, employee as empOf, position, vacancy as vacOf } from "@/lib/demo/queries";
import { DOC_CATEGORY_LABEL } from "@/lib/labels";
import { fmtBytes, fmtDate, fmtDateLong, parseDay } from "@/lib/format";
import type { DemoData, DocumentRow } from "@/lib/demo/types";
import { asset } from "@/lib/asset";

/** Botão "Ver" que abre o documento num visualizador. */
export function DocumentPreview({ doc, label = "Ver", className = "btn btn--ghost btn--sm" }: { doc: DocumentRow; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={`Abrir ${doc.title}`}>
        <Eye aria-hidden /> {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={doc.title} description={`${doc.originalName ?? DOC_CATEGORY_LABEL[doc.category]} · ${fmtBytes(doc.sizeBytes)}${doc.uploadedAt ? ` · enviado em ${fmtDate(doc.uploadedAt)}` : ""}`} className="viewer">
        {open ? <DocumentStage doc={doc} /> : null}
      </Modal>
    </>
  );
}

/** Área de visualização: arquivo real (se enviado nesta sessão) ou a folha do documento. */
export function DocumentStage({ doc, height }: { doc: DocumentRow; height?: number }) {
  const d = useDemoData();
  const url = fileUrl(doc.storageKey);
  if (!d) return <div className="viewer__stage" />;
  return (
    <div className="viewer__stage" style={height ? { minHeight: height } : undefined}>
      {url && doc.mimeType?.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={doc.title} />
      ) : url && doc.mimeType === "application/pdf" ? (
        <iframe src={url} title={doc.title} />
      ) : url ? (
        <div className="paper" style={{ textAlign: "center" }}>
          <FileText size={36} aria-hidden style={{ color: "var(--navy-500)", margin: "0 auto 10px" }} />
          <p>
            <strong>{doc.originalName}</strong>
          </p>
          <p className="muted">Arquivo do Word anexado nesta demonstração ({fmtBytes(doc.sizeBytes)}). A pré-visualização de DOCX acontece no visualizador do sistema real.</p>
        </div>
      ) : (
        <Paper doc={doc} d={d} />
      )}
      <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => window.print()}>
          <Printer aria-hidden /> Imprimir
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- modelos */

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mask = (seed: number, pattern: string) => pattern.replace(/9/g, (_, i: number) => String((seed >> (i % 24)) % 10));

const SALARY: Record<string, number> = {
  "Supervisor de Produção": 7800,
  "Líder de Produção": 4100,
  "Analista de Produção": 4300,
  "Operador de Máquinas": 2780,
  Montador: 2420,
  "Auxiliar de Produção": 2050,
  "Técnico de Laboratório": 3900,
  "Inspetor de Qualidade": 3100,
  Ferramenteiro: 4600,
  "Eletricista de Manutenção": 4200,
  Projetista: 5200,
  "Assistente Comercial": 2900,
  "Analista de Vendas": 4400,
  Conferente: 2500,
  "Auxiliar de Expedição": 2100,
  Almoxarife: 2600,
};

function PaperHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="paper__head">
      <div>
        <div className="paper__title">{title}</div>
        {sub ? <div className="paper__sub">{sub}</div> : null}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("/img/logo-ams.png")} alt="AMS Componentes" />
    </div>
  );
}

function Foot() {
  return <div className="paper__foot">Documento gerado para a demonstração do sistema de RH. Pessoas, números e dados são fictícios.</div>;
}

function Paper({ doc, d }: { doc: DocumentRow; d: DemoData }) {
  const app = doc.applicationId ? d.applications.find((a) => a.id === doc.applicationId) : undefined;
  const emp = empOf(d, doc.employeeId);
  if (doc.category === "CURRICULO") {
    const sourceApp = app ?? (emp?.sourceApplicationId ? d.applications.find((a) => a.id === emp.sourceApplicationId) : undefined);
    const cand = sourceApp ? candOf(d, sourceApp.candidateId) : undefined;
    const vac = sourceApp ? vacOf(d, sourceApp.vacancyId) : undefined;
    return <Resume name={cand?.name ?? emp?.name ?? "Candidato"} email={cand?.email ?? emp?.personalEmail ?? emp?.corporateEmail ?? ""} phone={cand?.phone ?? emp?.phone ?? ""} city={cand?.city ?? emp?.city ?? "Cotia"} education={cand?.education ?? null} experience={cand?.experience ?? null} linkedin={cand?.linkedin ?? null} target={vac?.title ?? position(d, emp?.positionId)?.title ?? ""} at={doc.uploadedAt ?? doc.createdAt} />;
  }
  if (!emp) return <Generic doc={doc} />;
  const pos = position(d, emp.positionId)?.title ?? "";
  const dep = dept(d, emp.departmentId)?.name ?? "";
  const seed = hash(emp.name);

  if (doc.category === "CONTRATO") {
    return (
      <div className="paper">
        <PaperHead title="Contrato individual de trabalho" sub="Por prazo indeterminado" />
        <div className="paper__grid">
          <p><b>Empregadora</b>AMS Componentes</p>
          <p><b>Empregado(a)</b>{emp.name}</p>
          <p><b>Cargo</b>{pos}</p>
          <p><b>Departamento</b>{dep}</p>
          <p><b>Admissão</b>{fmtDateLong(emp.hiredAt)}</p>
          <p><b>Local de trabalho</b>Cotia, SP</p>
        </div>
        <h4>Cláusulas principais</h4>
        <ul>
          <li>Jornada de 44 horas semanais, de segunda a sexta-feira, conforme escala da área.</li>
          <li>Período de experiência de 45 dias, prorrogável por igual período.</li>
          <li>Remuneração, benefícios e reajustes conforme a convenção coletiva da categoria.</li>
          <li>O(a) empregado(a) se compromete a seguir as normas de segurança e o uso de EPIs.</li>
        </ul>
        <div className="paper__sign">
          <span>AMS Componentes</span>
          <span>{emp.name}</span>
        </div>
        <Foot />
      </div>
    );
  }
  if (doc.category === "HOLERITE") {
    const base = SALARY[pos] ?? 3200;
    const extra = Math.round(base * (0.04 + (seed % 7) / 100));
    const gross = base + extra;
    const inss = Math.round(gross * 0.088);
    const vt = Math.round(base * 0.06);
    const net = gross - inss - vt;
    return (
      <div className="paper">
        <PaperHead title="Demonstrativo de pagamento" sub={doc.title.replace("Holerite de ", "Competência: ")} />
        <div className="paper__grid" style={{ marginBottom: 14 }}>
          <p><b>Colaborador(a)</b>{emp.name}</p>
          <p><b>Cargo</b>{pos}</p>
          <p><b>Matrícula</b>{String(1000 + emp.id).padStart(6, "0")}</p>
          <p><b>Admissão</b>{fmtDate(emp.hiredAt)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th className="num">Proventos</th>
              <th className="num">Descontos</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Salário base</td><td className="num">{brl(base)}</td><td /></tr>
            <tr><td>Horas extras 50%</td><td className="num">{brl(extra)}</td><td /></tr>
            <tr><td>INSS</td><td /><td className="num">{brl(inss)}</td></tr>
            <tr><td>Vale-transporte (6%)</td><td /><td className="num">{brl(vt)}</td></tr>
            <tr>
              <th>Líquido a receber</th>
              <th />
              <th className="num">R$ {brl(net)}</th>
            </tr>
          </tbody>
        </table>
        <p className="paper__sub" style={{ marginTop: 10 }}>FGTS do mês: R$ {brl(Math.round(gross * 0.08))}</p>
        <Foot />
      </div>
    );
  }
  if (doc.category === "IDENTIFICACAO") {
    return (
      <div className="paper">
        <PaperHead title={doc.title} sub="Cópia digitalizada para o cadastro" />
        <div className="row" style={{ "--gap": "18px", alignItems: "flex-start" } as React.CSSProperties}>
          <Avatar name={emp.name} photo={emp.photo} size="xl" />
          <div className="paper__grid" style={{ flex: 1 }}>
            <p><b>Nome</b>{emp.name}</p>
            <p><b>CPF</b>{mask(seed, "999.***.***-99")}</p>
            <p><b>RG</b>{mask(seed >> 3, "99.***.***-9")}</p>
            <p><b>Naturalidade</b>{emp.city ?? "São Paulo"}, SP</p>
          </div>
        </div>
        <p className="paper__sub" style={{ marginTop: 14 }}>Números parcialmente ocultos conforme a política de privacidade do sistema.</p>
        <Foot />
      </div>
    );
  }
  if (doc.category === "COMPROVANTE") {
    return (
      <div className="paper">
        <PaperHead title={doc.title} sub="Conta de consumo em nome do titular" />
        <div className="paper__grid">
          <p><b>Titular</b>{emp.name}</p>
          <p><b>Cidade</b>{emp.city ?? "Cotia"}, SP</p>
          <p><b>Endereço</b>Rua {["das Acácias", "Bandeirantes", "São Paulo", "Rio Branco", "dos Ipês"][seed % 5]}, {100 + (seed % 800)}</p>
          <p><b>Emissão</b>{fmtDate(doc.uploadedAt ?? doc.createdAt)}</p>
        </div>
        <Foot />
      </div>
    );
  }
  if (doc.category === "CERTIFICADO") {
    return (
      <div className="paper" style={{ textAlign: "center" }}>
        <PaperHead title="Certificado de conclusão" sub="Treinamento" />
        <p style={{ fontSize: "0.95rem", marginTop: 18 }}>Certificamos que</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--navy-900)" }}>{emp.name}</p>
        <p style={{ maxWidth: 420, margin: "8px auto" }}>
          concluiu o treinamento <strong>{doc.title.replace("Certificado ", "").replace(/^de /, "")}</strong>, com carga horária de {doc.title.includes("NR-10") ? 40 : 8 + (seed % 3) * 4} horas.
        </p>
        <div className="paper__sign">
          <span>Instrutor responsável</span>
          <span>Segurança do Trabalho</span>
        </div>
        <Foot />
      </div>
    );
  }
  if (doc.category === "ATESTADO") {
    const day = doc.uploadedAt ? parseDay(doc.uploadedAt) : new Date();
    return (
      <div className="paper">
        <PaperHead title="Atestado médico" sub="Clínica de atendimento ambulatorial" />
        <p>
          Atesto, para os devidos fins, que <strong>{emp.name}</strong> esteve sob meus cuidados em {day.toLocaleDateString("pt-BR")} e necessita de afastamento das atividades por {1 + (seed % 2)} dia(s).
        </p>
        <div className="paper__sign" style={{ gridTemplateColumns: "1fr" }}>
          <span>Médico(a) responsável · CRM {mask(seed, "99999")}</span>
        </div>
        <Foot />
      </div>
    );
  }
  return <Generic doc={doc} name={emp.name} />;
}

function Generic({ doc, name }: { doc: DocumentRow; name?: string }) {
  return (
    <div className="paper">
      <PaperHead title={doc.title} sub={DOC_CATEGORY_LABEL[doc.category]} />
      {name ? <p>Documento vinculado ao cadastro de <strong>{name}</strong>.</p> : null}
      <p className="muted">Arquivo {doc.originalName ?? ""} armazenado no cadastro.</p>
      <Foot />
    </div>
  );
}

const COMPANIES = ["Metalúrgica Alvorada", "Indústria Paulista de Componentes", "Autopeças Raposo", "Plásticos Granja Viana", "Distribuidora Rota Sul", "Usinagem Vale do Tietê", "Eletro Peças Osasco", "Comercial Atlântico"];
const COURSES: Record<string, string[]> = {
  prod: ["NR-12 · Segurança em máquinas", "Leitura e interpretação de desenho técnico", "Metrologia básica (paquímetro e micrômetro)"],
  qual: ["Ferramentas da qualidade", "Metrologia dimensional", "Interpretação de normas técnicas"],
  com: ["Atendimento ao cliente B2B", "Excel intermediário", "Técnicas de negociação"],
  exp: ["Inglês avançado", "Documentação de exportação", "Incoterms 2020"],
};

function Resume(p: { name: string; email: string; phone: string; city: string; education: string | null; experience: string | null; linkedin: string | null; target: string; at: string }) {
  const seed = hash(p.name);
  const area = /Qualidade|Laborat/.test(p.target) ? "qual" : /Comercial|Vendas/.test(p.target) ? "com" : /Export/.test(p.target) ? "exp" : "prod";
  const year = new Date(p.at).getFullYear();
  const first = p.experience === "Primeiro emprego";
  const jobs = first
    ? []
    : [
        { company: COMPANIES[seed % COMPANIES.length], role: p.target.replace(/ (Interno|da Qualidade)$/, ""), from: year - 1 - (seed % 3), to: "atual" },
        { company: COMPANIES[(seed >> 4) % COMPANIES.length], role: area === "prod" ? "Auxiliar de Produção" : area === "com" ? "Recepcionista" : "Assistente", from: year - 4 - (seed % 3), to: String(year - 1 - (seed % 3)) },
      ];
  return (
    <div className="paper">
      <div className="paper__resume-head">
        <Avatar name={p.name} />
        <div>
          <div className="paper__title" style={{ fontSize: "1.35rem" }}>{p.name}</div>
          <div className="paper__sub">
            {p.city}, SP · {p.phone} · {p.email}
            {p.linkedin ? ` · ${p.linkedin}` : ""}
          </div>
        </div>
      </div>
      <h4>Objetivo</h4>
      <p>{p.target ? `Atuar como ${p.target}, contribuindo com qualidade, segurança e organização no dia a dia da equipe.` : "Contribuir com a equipe e crescer profissionalmente na indústria."}</p>
      <h4>Experiência profissional</h4>
      {jobs.length ? (
        jobs.map((j) => (
          <p key={j.company + j.from}>
            <strong>{j.role}</strong> · {j.company}
            <br />
            <span className="paper__sub">
              {j.from} a {j.to}
            </span>
          </p>
        ))
      ) : (
        <p>Primeiro emprego. Participação em projetos escolares e cursos profissionalizantes.</p>
      )}
      <h4>Formação</h4>
      <p>{p.education ?? "Ensino médio completo"}</p>
      <h4>Cursos</h4>
      <ul>
        {COURSES[area].map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <Foot />
    </div>
  );
}
