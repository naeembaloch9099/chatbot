// Simple toast emitter used by components to request a toast.
const emitter = new EventTarget();

export function showToast({
  message = "",
  type = "info",
  duration = 2500,
} = {}) {
  emitter.dispatchEvent(
    new CustomEvent("toast", { detail: { message, type, duration } })
  );
}

export default emitter;
