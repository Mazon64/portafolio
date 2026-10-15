"use client";

import { useActionState, useState, type ReactNode } from "react";
import { SaveIcon, ShieldCheckIcon, EyeIcon, LockKeyholeIcon } from "lucide-react";
import { disclosureSchema, type DisclosurePolicy, relationships } from "@/lib/projects/disclosure";
import { saveDisclosureAction, uploadProjectMediaAction } from "./disclosure-actions";
import { Button } from "@/components/ui/button";
import { disclosureLabels } from "@/i18n/project-disclosure";

const inputClass = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:bg-muted/40";
const panelClass = "rounded-2xl border border-border bg-card p-6";

export function DisclosurePanel({ projectId, slug, revision, policy: initial, enabled, mediaEnabled = false, locale }: { projectId: string; slug: string; revision: string; policy: DisclosurePolicy; enabled: boolean; mediaEnabled?: boolean; locale: "es" | "en" }) {
  const es = locale === "es";
  const labels = disclosureLabels[locale];
  const [policy, setPolicy] = useState(initial);
  const [publicSlug, setPublicSlug] = useState(slug);
  const [saved, setSaved] = useState(JSON.stringify({ policy: initial, publicSlug: slug }));
  const [state, action, pending] = useActionState(async (previous: { status: string; revision: string }, form: FormData) => {
    const result = await saveDisclosureAction(previous, form);
    if (["success", "cache-error"].includes(result.status)) setSaved(JSON.stringify({ policy: JSON.parse(String(form.get("policy"))), publicSlug: String(form.get("publicSlug")) }));
    return result;
  }, { status: "idle", revision });
  const dirty = saved !== JSON.stringify({ policy, publicSlug });
  const restricted = policy.mode === "SELECTIVE" || policy.mode === "ANONYMIZED";
  const hidden = policy.mode === "INTERNAL" || policy.mode === "EXCLUDED";
  const valid = disclosureSchema.safeParse(policy).success && /^[a-z0-9-]{1,120}$/.test(publicSlug);
  const field = (label: string, value: string, change: (value: string) => void, multiline = false, maxLength = 6000, required = false) => <label className="block text-sm font-medium">{label}{multiline ? <textarea className={inputClass} value={value} onChange={(event) => change(event.target.value)} maxLength={maxLength} rows={4} required={required} /> : <input className={inputClass} value={value} onChange={(event) => change(event.target.value)} maxLength={maxLength} required={required} />}</label>;
  const select = (label: string, value: string, options: readonly string[], change: (value: string) => void) => <label className="block text-sm font-medium">{label}<select className={inputClass} value={value} onChange={(event) => change(event.target.value)}>{options.map((option) => <option key={option} value={option}>{labels[option]}</option>)}</select></label>;

  return <section className="mt-8 space-y-6" aria-label={es ? "Política del proyecto" : "Project policy"}>
    <form action={action} className={`${panelClass} space-y-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight"><ShieldCheckIcon aria-hidden="true" className="size-5 text-muted-foreground" />{es ? "Propiedad y publicación" : "Ownership and publication"}</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{es ? "Define tu relación con el proyecto y qué puede mostrarse en cada destino. Los cambios se aplican al guardar." : "Define your relationship to the project and what each destination may show. Changes take effect when saved."}</p></div><span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs">{!enabled ? (es ? "Solo lectura" : "Read only") : dirty ? (es ? "Cambios sin guardar" : "Unsaved changes") : revision || state.revision ? (es ? "Política guardada" : "Saved policy") : (es ? "Configuración predeterminada" : "Default settings")}</span></div>
      {!enabled && <p className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-6"><LockKeyholeIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{es ? "Las escrituras están deshabilitadas en este entorno. En Preview puedes revisar la política, pero no modificarla ni publicar cambios. La edición estará disponible en Producción." : "Writes are disabled in this environment. Preview lets you review the policy, but cannot modify it or publish changes. Editing is available in Production."}</p>}
      <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="revision" value={state.revision} /><input type="hidden" name="policy" value={JSON.stringify(policy)} /><input type="hidden" name="publicSlug" value={publicSlug} />
      <fieldset disabled={!enabled || pending} className="space-y-6 disabled:opacity-60">
        <Group title={es ? "01 · Identidad y participación" : "01 · Identity and participation"}>
          <div className="grid gap-5 md:grid-cols-2">
            {select(es ? "Mi relación con el proyecto" : "My relationship to the project", policy.relationship, relationships, (relationship) => setPolicy({ ...policy, relationship: relationship as DisclosurePolicy["relationship"] }))}
            {select(es ? "Estado de mi participación" : "My participation status", policy.participation.status, ["UNSPECIFIED", "ACTIVE", "FINISHED"], (status) => setPolicy({ ...policy, participation: { ...policy.participation, status: status as DisclosurePolicy["participation"]["status"] } }))}
            {field(es ? "Titular interno · no se publica" : "Internal owner · not published", policy.owner, (owner) => setPolicy({ ...policy, owner }), false, 200)}
            {field(es ? "Slug público · usa un alias en casos anónimos" : "Public slug · use an alias for anonymous cases", publicSlug, setPublicSlug, false, 120, true)}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">{(["es", "en"] as const).map((lang) => <Translation key={lang} lang={lang}>{(["role", "period", "contribution"] as const).map((key) => <div key={key}>{field(labels[key], policy.participation[key][lang], (value) => setPolicy({ ...policy, participation: { ...policy.participation, [key]: { ...policy.participation[key], [lang]: value } } }), key === "contribution")}</div>)}</Translation>)}</div>
          <p className="text-xs leading-6 text-muted-foreground">{es ? "La relación, el rol, el periodo y la contribución aparecen en la ficha pública y el CV cuando esos destinos están permitidos. El titular interno es solo una referencia administrativa." : "Relationship, role, period and contribution appear in the public project and CV when those destinations are allowed. The internal owner is an administrative reference only."}</p>
        </Group>
        <Group title={es ? "02 · Alcance de publicación" : "02 · Publication scope"}>
          {select(es ? "Divulgación" : "Disclosure", policy.mode, ["FULL", "SELECTIVE", "ANONYMIZED", "INTERNAL", "EXCLUDED"], (value) => { const mode = value as DisclosurePolicy["mode"]; setPolicy({ ...policy, mode, fields: mode === "ANONYMIZED" ? { ...policy.fields, repository: false, sources: false, media: false } : policy.fields, organizations: mode === "ANONYMIZED" ? policy.organizations.map((org) => ({ ...org, logoUrl: "" })) : policy.organizations }); })}
          <p className="rounded-xl bg-muted/40 p-4 text-sm leading-6">{hidden ? (es ? "Este proyecto queda oculto en todos los destinos. Excluido también elimina la evidencia interna y desactiva sus conectores." : "This project is hidden from every destination. Excluded also removes internal evidence and disables its connectors.") : restricted ? (es ? "Solo se publica el contenido autorizado de abajo. Se requieren nombre y resumen en español e inglés; no se reutiliza automáticamente el texto del repositorio." : "Only the approved content below is published. Spanish and English names and summaries are required; repository text is not reused automatically.") : (es ? "Se utiliza el contenido actual del proyecto y su sincronización. Los permisos de abajo limitan destinos y campos; no necesitas duplicar su nombre o descripción." : "Uses existing project content and synchronization. Permissions below limit destinations and fields; no need to duplicate its name or description.")}</p>
          <fieldset disabled={hidden} className="space-y-5 disabled:opacity-60"><legend className="sr-only">{es ? "Permisos de publicación" : "Publication permissions"}</legend>
            <Choices title={es ? "Destinos permitidos" : "Allowed destinations"}>{Object.entries(policy.surfaces).map(([key, value]) => <Check key={key} label={labels[key]} checked={value} onChange={(checked) => setPolicy({ ...policy, surfaces: { ...policy.surfaces, [key]: checked } })} />)}</Choices>
            <p className="text-xs leading-6 text-muted-foreground">{es ? "Estos permisos restringen la visibilidad existente del proyecto; no activan por sí solos una ficha oculta en Portafolio o CV." : "These permissions restrict the project's existing visibility; they do not enable a project hidden from Portfolio or CV."}</p>
            <Choices title={es ? "Campos permitidos" : "Allowed fields"}>{Object.entries(policy.fields).map(([key, value]) => <Check key={key} label={labels[key]} checked={value} disabled={policy.mode === "ANONYMIZED" && ["repository", "sources", "media"].includes(key)} onChange={(checked) => setPolicy({ ...policy, fields: { ...policy.fields, [key]: checked } })} />)}</Choices>
          </fieldset>
          {restricted && <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-2">{(["es", "en"] as const).map((lang) => <Translation key={lang} lang={lang}>{(["name", "summary", "details"] as const).map((key) => <div key={key}>{field(`${labels[key]}${key !== "details" ? " *" : ""}`, policy.approved[key][lang], (value) => setPolicy({ ...policy, approved: { ...policy.approved, [key]: { ...policy.approved[key], [lang]: value } } }), key !== "name", 6000, key !== "details")}</div>)}</Translation>)}</div>
            <div className="grid gap-5 md:grid-cols-2">
              {field(es ? "Tecnologías autorizadas · separadas por comas" : "Approved technologies · comma separated", policy.approved.technologies.join(", "), (value) => setPolicy({ ...policy, approved: { ...policy.approved, technologies: value.split(",").map((v) => v.trim()).filter(Boolean) } }))}
              <label className="block text-sm font-medium">{es ? "Estado publicable del proyecto" : "Publishable project status"}<select className={inputClass} value={policy.approved.status ?? ""} onChange={(event) => setPolicy({ ...policy, approved: { ...policy.approved, status: (event.target.value || null) as DisclosurePolicy["approved"]["status"] } })}><option value="">{es ? "No divulgar" : "Do not disclose"}</option>{["planned", "inProgress", "paused", "completed", "archived"].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
              {(["repositoryUrl", "demoUrl"] as const).map((key) => <div key={key}>{field(key === "repositoryUrl" ? (es ? "URL autorizada del repositorio" : "Approved repository URL") : (es ? "URL autorizada de la demo" : "Approved demo URL"), policy.approved[key], (value) => setPolicy({ ...policy, approved: { ...policy.approved, [key]: value } }), false, 2000)}</div>)}
            </div>
          </div>}
        </Group>
        <Group title={es ? "03 · Organizaciones" : "03 · Organizations"}>
          {!policy.organizations.length && <p className="text-sm text-muted-foreground">{es ? "No se mostrará ninguna organización. Puedes añadir un titular, empleador, cliente o equipo autorizado." : "No organization will be shown. You can add an authorized owner, employer, client or team."}</p>}
          {policy.organizations.map((org, index) => <div key={index} className="space-y-4 rounded-2xl border border-border p-5">
            {select(es ? "Relación de organización" : "Organization relationship", org.kind, ["OWNER", "EMPLOYER", "CLIENT", "TEAM"], (kind) => setPolicy({ ...policy, organizations: policy.organizations.map((value, i) => i === index ? { ...value, kind: kind as typeof org.kind } : value) }))}
            <div className="grid gap-4 md:grid-cols-2">{(["es", "en"] as const).map((lang) => <div key={lang}>{field(`${labels.name} · ${lang.toUpperCase()}`, org.name[lang], (name) => setPolicy({ ...policy, organizations: policy.organizations.map((value, i) => i === index ? { ...value, name: { ...value.name, [lang]: name } } : value) }))}</div>)}</div>
            {policy.mode !== "ANONYMIZED" && field(es ? "Logo · /api/project-media/ID" : "Logo · /api/project-media/ID", org.logoUrl, (logoUrl) => setPolicy({ ...policy, organizations: policy.organizations.map((value, i) => i === index ? { ...value, logoUrl } : value) }), false, 2000)}
            <Button type="button" variant="ghost" onClick={() => setPolicy({ ...policy, organizations: policy.organizations.filter((_, i) => i !== index) })}>{es ? "Quitar organización" : "Remove organization"}</Button>
          </div>)}
          <Button type="button" variant="outline" disabled={policy.organizations.length >= 6} onClick={() => setPolicy({ ...policy, organizations: [...policy.organizations, { kind: "EMPLOYER", name: { es: "", en: "" }, logoUrl: "" }] })}>{es ? "Añadir organización" : "Add organization"}</Button>
        </Group>
        <details className="rounded-2xl border border-border p-5"><summary className="cursor-pointer text-sm font-semibold">{es ? "Procesamiento, embargo y atribución" : "Processing, embargo and attribution"}</summary><div className="mt-5 grid gap-5 md:grid-cols-2">
          {select(es ? "Procesamiento externo con IA" : "External AI processing", policy.externalAi, ["NONE", "PUBLIC_ONLY", "PRIVATE_SELECTED"], (externalAi) => setPolicy({ ...policy, externalAi: externalAi as DisclosurePolicy["externalAi"] }))}
          {field(es ? "Embargo · fecha ISO UTC opcional" : "Embargo · optional ISO UTC date", policy.embargoUntil, (embargoUntil) => setPolicy({ ...policy, embargoUntil }))}
          <p className="text-xs text-muted-foreground md:col-span-2">{es ? "Ejemplo: 2026-12-01T00:00:00Z. Hasta esa fecha el proyecto no será visible." : "Example: 2026-12-01T00:00:00Z. The project stays hidden until that date."}</p>
          {field(es ? "IDs numéricos de GitHub · separados por comas" : "Numeric GitHub IDs · comma separated", policy.participation.githubIds.join(", "), (value) => setPolicy({ ...policy, participation: { ...policy.participation, githubIds: value.split(",").map((v) => v.trim()).filter(Boolean) } }))}
        </div></details>
        <details className="rounded-2xl border border-border p-5"><summary className="cursor-pointer text-sm font-semibold">{es ? "Imágenes autorizadas" : "Approved images"} · {policy.media.length}</summary><div className="mt-5 space-y-4"><p className="text-xs leading-6 text-muted-foreground">{es ? "Pega el ID devuelto por una subida. La imagen se publica después de guardar, si el modo y el permiso de medios lo permiten. Las capturas del repositorio se administran mediante la sincronización." : "Paste the ID returned by an upload. The image is published after saving if the mode and media permission allow it. Repository screenshots are managed through synchronization."}</p>
          {policy.media.map((media, index) => <div key={index} className="space-y-4 rounded-xl border border-border p-4">
            {field(es ? "ID de imagen" : "Image ID", media.id, (id) => setPolicy({ ...policy, media: policy.media.map((value, i) => i === index ? { ...value, id } : value) }), false, 36)}
            {select(es ? "Categoría" : "Category", media.category, ["interface", "features", "diagrams", "results"], (category) => setPolicy({ ...policy, media: policy.media.map((value, i) => i === index ? { ...value, category: category as typeof media.category } : value) }))}
            <div className="grid gap-4 md:grid-cols-2">{(["es", "en"] as const).map((lang) => <Translation key={lang} lang={lang}>{field(es ? "Texto alternativo" : "Alternative text", media.alt[lang], (alt) => setPolicy({ ...policy, media: policy.media.map((value, i) => i === index ? { ...value, alt: { ...value.alt, [lang]: alt } } : value) }))}{field(es ? "Descripción" : "Caption", media.caption[lang], (caption) => setPolicy({ ...policy, media: policy.media.map((value, i) => i === index ? { ...value, caption: { ...value.caption, [lang]: caption } } : value) }), true)}</Translation>)}</div>
            <Button type="button" variant="ghost" onClick={() => setPolicy({ ...policy, media: policy.media.filter((_, i) => i !== index) })}>{es ? "Quitar imagen" : "Remove image"}</Button>
          </div>)}<Button type="button" variant="outline" disabled={policy.media.length >= 8 || policy.mode === "ANONYMIZED"} onClick={() => setPolicy({ ...policy, media: [...policy.media, { id: "", alt: { es: "", en: "" }, caption: { es: "", en: "" }, category: "interface" }] })}>{es ? "Autorizar imagen" : "Authorize image"}</Button>
        </div></details>
        <div className="space-y-4 border-t border-border pt-6"><p className="flex gap-2 text-sm leading-6 text-muted-foreground"><EyeIcon aria-hidden="true" className="mt-1 size-4 shrink-0" />{es ? "Guardar actualiza la publicación, archiva los documentos derivados e invalida el contexto anterior del chat." : "Saving updates publication, archives derived documents and invalidates previous chat context."}</p>
          {!valid && <p role="status" className="text-sm text-destructive">{es ? "Revisa los datos: nombre y resumen ES/EN para publicación selectiva, URLs HTTPS, IDs de imagen válidos, textos alternativos ES/EN y fecha ISO UTC." : "Check the data: ES/EN name and summary for selective publication, HTTPS URLs, valid image IDs, ES/EN alternative text and ISO UTC date."}</p>}
          <Button type="submit" disabled={!valid || (!dirty && !!state.revision) || pending}><SaveIcon aria-hidden="true" />{pending ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar política" : "Save policy")}</Button>
        </div>
      </fieldset>
      <p role="status" className="text-sm text-muted-foreground">{state.status === "idle" || (dirty && state.status === "success") ? "" : ({ success: es ? "Política guardada y aplicada." : "Policy saved and applied.", conflict: es ? "La política cambió en otra sesión. Recarga antes de guardar." : "The policy changed in another session. Reload before saving.", error: es ? "No se pudo guardar. Revisa los permisos y que las imágenes pertenezcan a este proyecto." : "Unable to save. Check permissions and that images belong to this project.", invalid: es ? "Revisa los datos de la política." : "Check the policy data.", "cache-error": es ? "Política guardada; la actualización de caché está pendiente." : "Policy saved; cache refresh is pending." }[state.status])}</p>
    </form>
    <MediaUpload projectId={projectId} enabled={enabled && mediaEnabled} configured={mediaEnabled} es={es} />
  </section>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-5 border-t border-border pt-6"><h3 className="text-sm font-semibold tracking-wide">{title}</h3>{children}</section>;
}
function Translation({ lang, children }: { lang: string; children: ReactNode }) {
  return <fieldset className="space-y-4 rounded-2xl border border-border p-5"><legend className="px-2 font-mono text-xs uppercase">{lang}</legend>{children}</fieldset>;
}
function Choices({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset><legend className="mb-3 text-sm font-medium">{title}</legend><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div></fieldset>;
}
function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-sm"><input type="checkbox" className="size-4 accent-foreground" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}
function MediaUpload({ projectId, enabled, configured, es }: { projectId: string; enabled: boolean; configured: boolean; es: boolean }) {
  const [state, action, pending] = useActionState(uploadProjectMediaAction, { status: "idle" });
  return <form action={action} className={`${panelClass} space-y-4`}><h3 className="text-xl font-semibold">{es ? "Almacenamiento privado" : "Private storage"}</h3><p className="text-sm leading-6 text-muted-foreground">{!configured ? (es ? "El almacenamiento aún no está configurado. La subida estará disponible cuando se conecte el bucket privado." : "Storage is not configured yet. Uploads become available when the private bucket is connected.") : !enabled ? (es ? "Subida deshabilitada en este entorno de solo lectura." : "Uploads are disabled in this read-only environment.") : (es ? "PNG, JPEG o WebP · máximo 3 MB. Subir una imagen no la publica: autoriza su ID en la política." : "PNG, JPEG or WebP · up to 3 MB. Uploading does not publish an image: authorize its ID in the policy.")}</p><input type="hidden" name="projectId" value={projectId} /><input className={`${inputClass} file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground`} type="file" name="image" accept="image/png,image/jpeg,image/webp" required disabled={!enabled || pending} aria-label={es ? "Imagen" : "Image"} /><Button disabled={!enabled || pending}>{pending ? (es ? "Subiendo…" : "Uploading…") : (es ? "Subir imagen" : "Upload image")}</Button><p role="status" className="break-all text-sm text-muted-foreground">{state.status === "success" ? `Media ID: ${state.id}` : state.status === "error" ? (es ? "No se pudo subir. Revisa formato, tamaño y conexión al almacenamiento." : "Upload failed. Check format, size and storage connection.") : ""}</p></form>;
}
