// src/components/solicitudes/ui.jsx
// Piezas de interfaz compartidas por las pantallas de solicitudes.

export const inputClass = `
  w-full px-3 py-2 rounded-lg border border-slate-200 bg-white
  text-sm text-slate-800 placeholder-slate-400
  focus:outline-none focus:border-[#9F2241]
  focus:ring-2 focus:ring-[#9F2241]/15 transition
  disabled:bg-slate-50 disabled:text-slate-600
`;

export function Section({ title, subtitle, children, actions }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200
                        shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({ label, required = false, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export function TextArea({ value, onChange, disabled, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={disabled ? "" : placeholder}
      rows={rows}
      className={`${inputClass} resize-y`}
    />
  );
}
