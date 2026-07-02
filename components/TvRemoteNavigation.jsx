import { useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "iframe[tabindex]",
  "[role='button']",
  "[tabindex]:not([tabindex='-1'])",
  ".tv-focusable",
].join(",");

const NAV_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const ENTER_KEYS = new Set(["Enter", " "]);
const TYPING_SELECTOR = "input, textarea, select, [contenteditable='true']";

function isVisible(element) {
  if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

function centerOf(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function isCandidateInDirection(from, to, direction) {
  const buffer = 6;

  switch (direction) {
    case "ArrowUp":
      return to.y < from.y - buffer;
    case "ArrowDown":
      return to.y > from.y + buffer;
    case "ArrowLeft":
      return to.x < from.x - buffer;
    case "ArrowRight":
      return to.x > from.x + buffer;
    default:
      return false;
  }
}

function scoreCandidate(fromRect, candidateRect, direction) {
  const from = centerOf(fromRect);
  const to = centerOf(candidateRect);
  const primaryDistance = direction === "ArrowUp" || direction === "ArrowDown"
    ? Math.abs(to.y - from.y)
    : Math.abs(to.x - from.x);
  const secondaryDistance = direction === "ArrowUp" || direction === "ArrowDown"
    ? Math.abs(to.x - from.x)
    : Math.abs(to.y - from.y);

  const horizontalOverlap = Math.max(
    0,
    Math.min(fromRect.right, candidateRect.right) - Math.max(fromRect.left, candidateRect.left)
  );
  const verticalOverlap = Math.max(
    0,
    Math.min(fromRect.bottom, candidateRect.bottom) - Math.max(fromRect.top, candidateRect.top)
  );
  const overlapBonus = direction === "ArrowUp" || direction === "ArrowDown"
    ? horizontalOverlap
    : verticalOverlap;

  return primaryDistance * 3 + secondaryDistance - overlapBonus * 1.5;
}

function getFocusableElements() {
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(isVisible)
    .filter((element, index, elements) => elements.indexOf(element) === index);
}

function focusElement(element) {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
}

function findFirstFocusable(elements) {
  return [...elements].sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return aRect.top - bRect.top || aRect.left - bRect.left;
  })[0];
}

function findNextFocusable(currentElement, direction) {
  const elements = getFocusableElements();
  if (!elements.length) return null;

  if (!currentElement || !isVisible(currentElement) || !elements.includes(currentElement)) {
    return findFirstFocusable(elements);
  }

  const fromRect = currentElement.getBoundingClientRect();
  const fromCenter = centerOf(fromRect);

  return elements
    .filter((element) => element !== currentElement)
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => isCandidateInDirection(fromCenter, centerOf(rect), direction))
    .sort((a, b) => scoreCandidate(fromRect, a.rect, direction) - scoreCandidate(fromRect, b.rect, direction))[0]?.element || null;
}

export default function TvRemoteNavigation() {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;

      if (ENTER_KEYS.has(event.key) && activeElement?.matches?.(".tv-player-frame")) {
        const iframe = activeElement.querySelector("iframe");
        if (iframe) {
          event.preventDefault();
          event.stopPropagation();
          iframe.focus({ preventScroll: true });
        }
        return;
      }

      if (!NAV_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (activeElement?.matches?.(TYPING_SELECTOR)) {
        return;
      }

      const nextElement = findNextFocusable(activeElement, event.key);
      if (!nextElement) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      focusElement(nextElement);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return null;
}