export type TrainingErrorKind =
  | "auth"
  | "conflict"
  | "validation"
  | "network"
  | "response";
export class TrainingError extends Error {
  constructor(readonly kind: TrainingErrorKind) {
    super(
      {
        auth: "Sign in again to save your changes.",
        conflict:
          "A newer version is saved. Review it before reapplying your changes.",
        validation:
          "This change could not be saved. Check the values and try again.",
        network: "Couldn’t connect. Your changes are kept on this device.",
        response: "Couldn’t read the saved response safely. Please retry.",
      }[kind],
    );
    this.name = "TrainingError";
  }
}
export function trainingFailure(status: number, code: unknown): TrainingError {
  if (
    status === 401 ||
    status === 403 ||
    code === "42501" ||
    code === "PGRST301"
  )
    return new TrainingError("auth");
  if (code === "PT409" || code === "40001")
    return new TrainingError("conflict");
  if (code === "23514" || code === "23505" || status === 400)
    return new TrainingError("validation");
  return new TrainingError("network");
}
