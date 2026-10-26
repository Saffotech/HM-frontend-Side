import { useId } from "react";

/** Arrow, Home, and End movement for a tablist. -1 means the key does not move. */
export function nextTabIndex(length, index, key) {
  if (length <= 0 || index < 0 || index >= length) return -1;
  if (key === "ArrowRight") return (index + 1) % length;
  if (key === "ArrowLeft") return (index - 1 + length) % length;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return -1;
}

export function onCrmTabKeyDown(event) {
  const tabs = [...event.currentTarget.querySelectorAll("[role='tab']")];
  const nextIndex = nextTabIndex(tabs.length, tabs.indexOf(event.target), event.key);
  if (nextIndex < 0 || tabs[nextIndex] === event.target) return;
  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}

export function useCrmTabIds(prefix) {
  const base = useId();
  return {
    panelId: `${prefix}${base}panel`,
    tabId: (key) => `${prefix}${base}tab-${String(key).replace(/\s+/g, "-")}`,
  };
}

export function crmTabProps(id, selected, panelId) {
  return {
    id,
    role: "tab",
    "aria-selected": selected,
    "aria-controls": panelId,
    tabIndex: selected ? 0 : -1,
  };
}

export function crmTabPanelProps(panelId, tabId) {
  return {
    id: panelId,
    role: "tabpanel",
    "aria-labelledby": tabId,
  };
}
