"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type TooltipTriggerProps = {
  "aria-describedby"?: string;
};

type TooltipProps = {
  children: ReactElement<TooltipTriggerProps>;
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
};

type Position = {
  top: number;
  left: number;
};

export default function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  className = "",
}: TooltipProps) {
  const tooltipId = useId();

  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const showTooltip = () => {
    setPosition(null);
    setIsOpen(true);
  };

  const hideTooltip = () => {
    setIsOpen(false);
  };

  const existingDescription = children.props["aria-describedby"];

  const trigger = cloneElement(children, {
    "aria-describedby": [existingDescription, tooltipId]
      .filter(Boolean)
      .join(" "),
  });

  useEffect(() => {
    if (!isOpen) return;

    let frame = 0;

    const updatePosition = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const triggerElement = triggerRef.current;
        const tooltipElement = tooltipRef.current;

        if (!triggerElement || !tooltipElement) return;

        const triggerRect = triggerElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();

        const gap = 8;
        const padding = 12;

        let top = 0;
        let left = 0;

        const getHorizontalPosition = () => {
          if (align === "start") return triggerRect.left;
          if (align === "end") {
            return triggerRect.right - tooltipRect.width;
          }

          return (
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
          );
        };

        const getVerticalPosition = () => {
          if (align === "start") return triggerRect.top;
          if (align === "end") {
            return triggerRect.bottom - tooltipRect.height;
          }

          return (
            triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          );
        };

        switch (side) {
          case "top":
            top = triggerRect.top - tooltipRect.height - gap;
            left = getHorizontalPosition();
            break;

          case "bottom":
            top = triggerRect.bottom + gap;
            left = getHorizontalPosition();
            break;

          case "left":
            top = getVerticalPosition();
            left = triggerRect.left - tooltipRect.width - gap;
            break;

          case "right":
            top = getVerticalPosition();
            left = triggerRect.right + gap;
            break;
        }

        // Keep the tooltip inside the viewport.
        left = Math.max(
          padding,
          Math.min(left, window.innerWidth - tooltipRect.width - padding)
        );

        top = Math.max(
          padding,
          Math.min(top, window.innerHeight - tooltipRect.height - padding)
        );

        setPosition({ top, left });
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, side, align]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocusCapture={showTooltip}
        onBlurCapture={(event) => {
          if (
            !triggerRef.current?.contains(event.relatedTarget as Node | null)
          ) {
            hideTooltip();
          }
        }}
      >
        {trigger}
      </span>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className={`
              pointer-events-none fixed z-[99999]
              w-max max-w-[min(16rem,calc(100vw-24px))]
              rounded-lg border border-slate-700
              bg-slate-900 px-3 py-2
              text-center text-xs leading-5 text-slate-200
              whitespace-normal break-words
              shadow-xl shadow-black/30
              transition-opacity duration-150
            `}
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? "visible" : "hidden",
              opacity: position ? 1 : 0,
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
