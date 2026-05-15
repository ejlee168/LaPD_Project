import { useEffect, useState } from "react";

const STORAGE_KEY = "lapd-show-categories";
const EVENT_NAME = "lapd-show-categories-change";

export function getShowCategories(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    return raw === "true";
  } catch {
    return false;
  }
}

export function setShowCategories(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(value));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function useShowCategories(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(getShowCategories());
    function onChange() {
      setShow(getShowCategories());
    }
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);
  return show;
}
