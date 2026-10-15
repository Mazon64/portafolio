// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./disclosure-actions", () => ({ saveDisclosureAction: vi.fn(), uploadProjectMediaAction: vi.fn() }));
import { DisclosurePanel } from "./disclosure-panel";
import { defaultDisclosure } from "@/lib/projects/disclosure";

let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = async (enabled: boolean) => act(async () => root.render(<DisclosurePanel projectId="project" slug="portfolio" revision="" policy={structuredClone(defaultDisclosure)} enabled={enabled} locale="es" />));
function select(label: string) { return [...container.querySelectorAll("label")].find((node) => node.textContent?.startsWith(label))!.querySelector("select")!; }
async function choose(label: string, value: string) { await act(async () => { const node = select(label); node.value = value; node.dispatchEvent(new Event("change", { bubbles: true })); }); }
describe("disclosure editing experience", () => {
  it("explains Preview read-only mode and unavailable storage without offering a working submit", async () => {
    await render(false);
    expect(container.textContent).toContain("En Preview puedes revisar la política");
    expect(container.textContent).toContain("El almacenamiento aún no está configurado");
    expect(select("Mi relación").closest("fieldset")!.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[type="file"]')!.disabled).toBe(true);
  });
  it("shows approved bilingual content only when applicable and prevents invalid selective publication", async () => {
    await render(true);
    expect(container.textContent).toContain("no necesitas duplicar");
    expect(container.querySelector("form")!.querySelectorAll("input[required]")).toHaveLength(1);
    await choose("Divulgación", "SELECTIVE");
    expect(container.querySelector("form")!.querySelectorAll("input[required]")).toHaveLength(3);
    expect(container.querySelectorAll("textarea[required]")).toHaveLength(2);
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    expect(container.textContent).toContain("Cambios sin guardar");
    await choose("Divulgación", "FULL");
    expect(container.querySelectorAll("textarea[required]")).toHaveLength(0);
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });
  it("disables identifying permissions when switching to an anonymous case", async () => {
    await render(true);
    await choose("Divulgación", "ANONYMIZED");
    for (const label of ["Repositorio", "Referencias a fuentes", "Imágenes y logos"]) {
      const input = [...container.querySelectorAll("label")].find((node) => node.textContent === label)!.querySelector("input")!;
      expect(input.checked).toBe(false); expect(input.disabled).toBe(true);
    }
    const policy = JSON.parse(container.querySelector<HTMLInputElement>('input[name="policy"]')!.value);
    expect(policy.mode).toBe("ANONYMIZED");
    expect(policy.fields.repository).toBe(false);
  });
});
