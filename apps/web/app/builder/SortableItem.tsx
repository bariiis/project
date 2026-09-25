"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** One row of the page outline; the ⋮⋮ handle drags it (pointer or keyboard: space, arrows, space). */
export function SortableItem({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-start rounded-xl border bg-ink ${isDragging ? "z-10 border-ember shadow-2xl" : "border-line"}`}
      data-slug={id}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${label} bloğunu sürükle`}
        className="mt-2.5 ml-1.5 shrink-0 cursor-grab touch-none rounded px-1 py-0.5 text-muted hover:text-paper active:cursor-grabbing"
      >
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
