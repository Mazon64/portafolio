import "server-only";
import { findInstallation, githubAppConfigured, installationSource, resolveInstalledRepository } from "./github-app";
import { getRepository, publicSource, type RepositorySource } from "./github";

// Opens a repository by its stable numeric ID. An App installation is preferred
// because it reaches private and organization repositories; without one only a
// verified public repository is admitted. App failures other than "not installed"
// propagate so a transient outage never looks like a repository made private.
export async function openRepository(repositoryId: string, fullNameHint?: string | null): Promise<RepositorySource> {
  if (githubAppConfigured()) {
    const installationId = await findInstallation(repositoryId, fullNameHint);
    if (installationId) return installationSource(installationId, repositoryId);
  }
  return publicSource(await getRepository(repositoryId));
}

// Accepts a numeric ID or owner/name (also a github.com URL) typed in the CMS.
export async function resolveRepository(identifier: string): Promise<RepositorySource> {
  const value = identifier.trim().replace(/^https:\/\/github\.com\//i, "").replace(/\/+$/, "").replace(/\.git$/, "");
  if (/^[1-9]\d{0,19}$/.test(value)) return openRepository(value, null);
  if (!/^[\w.-]+\/[\w.-]+$/.test(value)) throw new Error("Invalid repository identifier");
  const installed = await resolveInstalledRepository(value);
  if (installed) return openRepository(installed, value);
  return publicSource(await getRepository(value));
}
