"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);

  const closeDialog = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setDialog(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.68)", backdropFilter: "blur(4px)" }}
          onClick={() => closeDialog(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline-strong)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
              {dialog.title}
            </p>
            {dialog.description ? (
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>
                {dialog.description}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => closeDialog(false)} className="btn-outline">
                {dialog.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => closeDialog(true)}
                className="btn-primary"
                style={dialog.variant === "destructive" ? { backgroundColor: "var(--accent-red)", borderColor: "var(--accent-red)" } : undefined}
              >
                {dialog.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within ConfirmProvider");
  return context.confirm;
}
