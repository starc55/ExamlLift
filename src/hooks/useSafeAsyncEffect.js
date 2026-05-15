import { useEffect } from "react";

const DEFAULT_TIMEOUT_MS = 10000;

export function useSafeAsyncEffect(label, effect, dependencies, options = {}) {
  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    const requestId = `${label}-${startedAt}-${Math.random()
      .toString(16)
      .slice(2, 8)}`;
    let active = true;

    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const timeoutId = window.setTimeout(() => {
      if (active && !controller.signal.aborted) {
        console.warn("[request] long-running", {
          label,
          requestId,
          elapsedMs: Date.now() - startedAt,
        });
      }
    }, timeoutMs);

    console.info("[request] started", { label, requestId });

    const helpers = {
      signal: controller.signal,
      requestId,
      isActive: () => active && !controller.signal.aborted,
      safeSet: (update) => {
        if (active && !controller.signal.aborted) {
          update();
          return true;
        }

        console.info("[request] state update skipped", { label, requestId });
        return false;
      },
    };

    Promise.resolve()
      .then(() => effect(helpers))
      .then(() => {
        if (active && !controller.signal.aborted) {
          console.info("[request] finished", {
            label,
            requestId,
            elapsedMs: Date.now() - startedAt,
          });
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === "AbortError") {
          console.info("[request] aborted", {
            label,
            requestId,
            elapsedMs: Date.now() - startedAt,
          });
          return;
        }

        console.error("[request] failed", {
          label,
          requestId,
          elapsedMs: Date.now() - startedAt,
          error,
        });
      });

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
      console.info("[request] aborted", {
        label,
        requestId,
        reason: "component unmounted",
        elapsedMs: Date.now() - startedAt,
      });
    };
  }, dependencies);
}
