"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { connectSourceAction, refreshSourceAction } from "./disclosure-actions";

type Source = { id: string; fullName: string; visibility: string; enabled: boolean; analysis?: unknown; evidence: Array<{ path: string; content: string; commitSha: string }> };
export function RepositoryPanel({ projectId, sources, enabled, configured, locale }: { projectId: string; sources: Source[]; enabled: boolean; configured: boolean; locale: "es" | "en" }) {
  const es = locale === "es";
  const [state, action, pending] = useActionState(connectSourceAction, { status: "idle" });
  const field = "mt-2 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
  return <section className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-semibold">{es ? "Fuentes internas · GitHub App" : "Internal sources · GitHub App"}</h2>
    {!enabled && <p className="rounded-xl bg-muted/40 p-4 text-sm leading-6">{!configured ? (es ? "Conector pendiente de configuración. Conecta la GitHub App para habilitar la importación de fuentes privadas." : "Connector setup pending. Connect the GitHub App to enable private source imports.") : (es ? "Importación deshabilitada en este entorno de solo lectura." : "Imports are disabled in this read-only environment.")}</p>}
    <p className="text-sm text-muted-foreground">{es ? "Instala la GitHub App en los repositorios seleccionados. Guarda primero una política selectiva o interna. Estas fuentes no se publican ni se indexan en el chat." : "Install the GitHub App on selected repositories. Save a selective or internal policy first. These sources are not published or indexed in chat."}</p>
    <form action={action}><input type="hidden" name="projectId" value={projectId} /><fieldset disabled={!enabled || pending} className="space-y-4 text-sm font-medium disabled:opacity-60">
      <label className="block">Installation ID<input className={field} name="installationId" required pattern="[1-9][0-9]*" /></label>
      <label className="block">Repository ID<input className={field} name="repositoryId" required pattern="[1-9][0-9]*" /></label>
      <label className="block">{es ? "Archivos permitidos, uno por línea" : "Allowed files, one per line"}<textarea className={field} name="paths" required rows={4} maxLength={5000} placeholder="README.md" /></label>
      <Button type="submit">{es ? "Conectar e importar" : "Connect and import"}</Button>
    </fieldset><p role="status">{state.status === "success" ? (es ? "Fuentes importadas." : "Sources imported.") : state.status === "error" ? (es ? "No se pudo importar. Revisa la instalación, permisos y política." : "Import failed. Check installation, permissions and policy.") : ""}</p></form>
    {sources.map((source) => <SourceCard key={source.id} source={source} enabled={enabled} es={es} />)}
  </section>;
}
function SourceCard({ source, enabled, es }: { source: Source; enabled: boolean; es: boolean }) {
  const [state, action, pending] = useActionState(refreshSourceAction, { status: "idle" });
  return <div className="rounded-lg border p-4"><h3 className="font-semibold">{source.fullName} · {source.visibility}</h3><form action={action}><input type="hidden" name="id" value={source.id} /><Button variant="outline" disabled={!enabled || !source.enabled || pending}>{es ? "Actualizar evidencia" : "Refresh evidence"}</Button><span role="status">{state.status === "idle" ? "" : state.status}</span></form>{source.analysis ? <details className="mt-3"><summary>{es ? "Propuesta IA interna · requiere autorización antes de divulgar" : "Internal AI proposal · authorization required before disclosure"}</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(source.analysis, null, 2)}</pre></details> : null}{source.evidence.map((item) => <details key={item.path} className="mt-3"><summary>{item.path} · {item.commitSha.slice(0, 7)}</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs">{item.content}</pre></details>)}</div>;
}
