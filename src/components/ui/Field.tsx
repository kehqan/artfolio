import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

const control =
  "w-full rounded-control border-hair border-line-strong bg-surface font-ui text-control text-fg " +
  "placeholder:text-fg-3 transition-[border-color,box-shadow] duration-fast ease-out " +
  "hover:border-n-400 focus:border-ink focus:shadow-hard-1 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-disabled " +
  "aria-[invalid=true]:border-bad";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("font-ui text-label font-semibold text-fg", className)} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-10 px-3", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(control, "resize-y px-3 py-2.5", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(control, "h-10 cursor-pointer px-3", className)} {...props}>
      {children}
    </select>
  );
});

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Shown instead of the hint and marks the control invalid. */
  error?: ReactNode;
  className?: string;
  /** Receives the generated id and aria props to spread on the control. */
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}

/**
 * Label + control + hint/error, wired for accessibility.
 *
 *   <Field label="Price" hint="In euros">
 *     {(p) => <Input {...p} value={price} onChange={…} />}
 *   </Field>
 */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-describedby": note ? noteId : undefined, "aria-invalid": error ? true : undefined })}
      {note && (
        <p id={noteId} className={cn("font-ui text-caption", error ? "font-medium text-bad" : "text-fg-3")}>
          {note}
        </p>
      )}
    </div>
  );
}
