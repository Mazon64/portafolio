export type ProfileField =
  | "fullName"
  | "email"
  | "esTitle"
  | "esLongBio"
  | "esContactText"
  | "enTitle"
  | "enLongBio"
  | "enContactText";

export type ProfileFormState = {
  status:
    | "idle"
    | "success"
    | "invalid"
    | "disabled"
    | "conflict"
    | "cache-error"
    | "error";
  errors?: Partial<Record<ProfileField, string[]>>;
  updatedAt?: string;
};

export const initialProfileFormState: ProfileFormState = { status: "idle" };
