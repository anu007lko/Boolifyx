// Memory cache fallback for environments with blocked storage scopes (e.g., restricted iframe sandboxes)
const memoryCache: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`[SafeStorage] localStorage.getItem blocked or failed for key "${key}":`, error);
      return memoryCache[`local_${key}`] !== undefined ? memoryCache[`local_${key}`] : null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`[SafeStorage] localStorage.setItem blocked or failed for key "${key}":`, error);
      memoryCache[`local_${key}`] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[SafeStorage] localStorage.removeItem blocked or failed for key "${key}":`, error);
      delete memoryCache[`local_${key}`];
    }
  }
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`[SafeStorage] sessionStorage.getItem blocked or failed for key "${key}":`, error);
      return memoryCache[`session_${key}`] !== undefined ? memoryCache[`session_${key}`] : null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn(`[SafeStorage] sessionStorage.setItem blocked or failed for key "${key}":`, error);
      memoryCache[`session_${key}`] = value;
    }
  },
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`[SafeStorage] sessionStorage.removeItem blocked or failed for key "${key}":`, error);
      delete memoryCache[`session_${key}`];
    }
  },
  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn(`[SafeStorage] sessionStorage.clear blocked or failed:`, error);
      // clean memory session cache
      for (const key of Object.keys(memoryCache)) {
        if (key.startsWith("session_")) {
          delete memoryCache[key];
        }
      }
    }
  }
};

export async function safeCopyToClipboard(text: string): Promise<boolean> {
  // First attempt using the modern Navigator Clipboard API
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn("[SafeStorage] navigator.clipboard.writeText threw an error, trying fallback:", e);
    }
  }

  // Fallback mechanism for restricted environments or cross-origin iframes
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch (err) {
    console.error("[SafeStorage] Fallback clipboard copy failed:", err);
  }

  return false;
}
