export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message?: string; fieldErrors?: FieldErrors };

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}
