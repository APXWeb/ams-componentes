import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canSeeEmployee, getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { readStored } from "@/lib/storage";
import { audit } from "@/lib/audit";

/*
 * Única porta de saída de arquivos privados. Não existe URL pública para documentos:
 * cada requisição valida a sessão, o perfil e o vínculo com o dono do arquivo, e é auditada.
 */
export async function GET(req: Request, ctx: RouteContext<"/rh/arquivos/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autenticado", { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("Não encontrado", { status: 404 });

  const doc = db.select().from(schema.documents).where(eq(schema.documents.id, id)).get();
  if (!doc || !doc.storageKey) return new Response("Não encontrado", { status: 404 });

  let allowed = false;
  let isPhoto = false;
  if (doc.employeeId) {
    const emp = db.select().from(schema.employees).where(eq(schema.employees.id, doc.employeeId)).get();
    isPhoto = emp?.photoDocumentId === doc.id;
    if (emp) {
      if (isPhoto) allowed = canSeeEmployee(user, emp);
      else allowed = can(user.role, "documents.manage") || user.employeeId === emp.id;
    }
  } else if (doc.applicationId) {
    const app = db
      .select({ departmentId: schema.vacancies.departmentId })
      .from(schema.applications)
      .innerJoin(schema.vacancies, eq(schema.vacancies.id, schema.applications.vacancyId))
      .where(eq(schema.applications.id, doc.applicationId))
      .get();
    allowed = can(user.role, "recruitment.manage") || (can(user.role, "recruitment.view") && !!app && app.departmentId === user.departmentId);
  }
  // 404 em vez de 403 para não revelar a existência do arquivo
  if (!allowed) return new Response("Não encontrado", { status: 404 });

  const body = await readStored(doc.storageKey).catch(() => null);
  if (!body) return new Response("Arquivo indisponível", { status: 410 });
  if (!isPhoto) await audit(user, "DOWNLOAD", `Arquivo acessado: ${doc.title}`, { type: "document", id: doc.id });

  const download = new URL(req.url).searchParams.has("baixar") || doc.mimeType?.includes("wordprocessingml");
  const name = encodeURIComponent(doc.originalName ?? `documento-${doc.id}`);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Length": String(body.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
      "Cache-Control": "private, no-store",
      // só PDF, DOCX e imagens raster passam pela validação de assinatura em storage.ts; nosniff impede reinterpretação
      "X-Content-Type-Options": "nosniff",
    },
  });
}
