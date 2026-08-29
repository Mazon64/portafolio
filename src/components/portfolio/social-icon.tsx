import { Globe2Icon, MailIcon } from "lucide-react";
import {
  FaBluesky,
  FaDev,
  FaDiscord,
  FaFacebook,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaMastodon,
  FaMedium,
  FaStackOverflow,
  FaThreads,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { IconType } from "react-icons";

const socialIcons: Record<string, IconType> = {
  bluesky: FaBluesky,
  dev: FaDev,
  discord: FaDiscord,
  facebook: FaFacebook,
  github: FaGithub,
  instagram: FaInstagram,
  linkedin: FaLinkedin,
  mastodon: FaMastodon,
  medium: FaMedium,
  stackoverflow: FaStackOverflow,
  threads: FaThreads,
  tiktok: FaTiktok,
  x: FaXTwitter,
  youtube: FaYoutube,
};

export function SocialIcon({ iconKey }: { iconKey: string | null }) {
  if (iconKey === "email") {
    return <MailIcon className="size-10 shrink-0" aria-hidden="true" />;
  }

  const Icon = iconKey ? socialIcons[iconKey.toLowerCase()] : undefined;
  return Icon ? (
    <Icon className="size-10 shrink-0" aria-hidden="true" />
  ) : (
    <Globe2Icon className="size-10 shrink-0" aria-hidden="true" />
  );
}
