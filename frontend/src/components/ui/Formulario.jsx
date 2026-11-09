// src/components/ui/Formulario.jsx
// Piezas de formulario: estilo de los campos, campo con etiqueta, área de texto
// y sección (tarjeta con título).
import { AlertCircle } from "lucide-react";

// Estilo único de inputs, selects y textareas de todo el sistema
export const inputClass = `
  w-full px-3 py-2 rounded-lg border border-slate-200 bg-white
  text-sm text-slate-800 placeholder-slate-400
  focus:outline-none focus:border-institucional
  focus:ring-2 focus:ring-institucional/15 transition
  disabled:bg-slate-50 disabled:text-slate-600
`;

export function Section({ title, subtitle, children, actions }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200
                        shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// Etiqueta + campo. "required" agrega el asterisco rojo.
// "error": aviso debajo del campo (ej. cuando se quiso guardar sin llenarlo);
// el borde del campo se pone rojo mientras exista (ver index.css).
export function Field({ label, required = false, error = "", children, className = "" }) {
  return (
    <div className={className} data-error={error ? "" : undefined}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error && <AvisoCampo>{error}</AvisoCampo>}
    </div>
  );
}

// Mensaje rojo bajo un campo vacío o inválido
export function AvisoCampo({ children }) {
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700 animate-fade-in">
      <AlertCircle size={14} className="shrink-0 mt-px" />
      <span>{children}</span>
    </p>
  );
}

// maxLength: tope de lo que cabe en la columna TEXT de MySQL, con margen para acentos
export function TextArea({ value, onChange, disabled, placeholder, rows = 4, maxLength = 10000 }) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={disabled ? "" : placeholder}
      rows={rows}
      maxLength={maxLength}
      className={`${inputClass} resize-y`}
    />
  );
}
