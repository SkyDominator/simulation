export const isE2EMode = (): boolean => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const flag = import.meta.env.VITE_E2E_MODE;
    if (flag !== undefined) {
      return String(flag).toLowerCase() === "true";
    }
  }

  if (typeof navigator !== "undefined" && "webdriver" in navigator) {
    return Boolean(
      (navigator as Navigator & { webdriver?: boolean }).webdriver
    );
  }

  return false;
};
