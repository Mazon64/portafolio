import { Code2Icon, WorkflowIcon } from "lucide-react";
import {
  SiDocker,
  SiExpress,
  SiGit,
  SiGithub,
  SiIonic,
  SiJavascript,
  SiMysql,
  SiNodedotjs,
  SiReact,
  SiVuedotjs,
} from "react-icons/si";

export const skillIcons = {
  javascript: SiJavascript,
  nodejs: SiNodedotjs,
  expressjs: SiExpress,
  mysql: SiMysql,
  vuejs: SiVuedotjs,
  react: SiReact,
  ionic: SiIonic,
  docker: SiDocker,
  workflow: WorkflowIcon,
  git: SiGit,
  github: SiGithub,
} as const;

export type SkillIconKey = keyof typeof skillIcons;

export function hasSkillIcon(iconKey: string | null): iconKey is SkillIconKey {
  return iconKey !== null && iconKey in skillIcons;
}

export function SkillIcon({ iconKey }: { iconKey: string | null }) {
  const Icon = hasSkillIcon(iconKey) ? skillIcons[iconKey] : Code2Icon;
  return <Icon aria-hidden="true" className="size-12 sm:size-14" />;
}
