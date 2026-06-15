import React, { useState, useRef, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Reusable auto-suggestion (autocomplete) input for the Import       */
/*  module. Works for both single-line inputs and multi-line          */
/*  textareas, shows matching previously-submitted values, and lets    */
/*  the user pick one or keep typing freely.                          */
/* ------------------------------------------------------------------ */
const norm = (s) => (s || "").trim().toLowerCase();

const AutoSuggest = ({
  label,
  value,
  onChange,
  suggestions = [],
  multiline = false,
  rows = 3,
  required = false,
  disabled = false,
  placeholder,
  inputCls,
  labelCls,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = norm(value);
  const filtered = (suggestions || [])
    .filter((s) => s && norm(s) !== q && norm(s).includes(q))
    .slice(0, 8);

  const Comp = multiline ? "textarea" : "input";

  return (
    <div className="flex flex-col gap-0.5 relative" ref={ref}>
      <label className={labelCls}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Comp
        value={value ?? ""}
        rows={multiline ? rows : undefined}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          if (!disabled) setOpen(true);
        }}
        onFocus={() => !disabled && setOpen(true)}
        placeholder={placeholder}
        className={`${inputCls}${multiline ? " resize-none" : ""}${disabled ? " bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
      />
      {open && !disabled && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-44 overflow-auto">
          {filtered.map((s, i) => (
            <button
              type="button"
              key={i}
              onMouseDown={(e) => {
                // mousedown + preventDefault so selection wins over blur
                e.preventDefault();
                onChange(s);
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-violet-50 whitespace-pre-wrap break-words border-b border-gray-50 last:border-b-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoSuggest;
