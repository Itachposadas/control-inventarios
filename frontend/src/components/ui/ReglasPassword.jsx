// src/components/ui/ReglasPassword.jsx
// Lista de requisitos de la contraseña que se van marcando mientras se escribe.
//   <ReglasPassword password={form.nueva} usuario={user.username} />
import { reglasPassword } from "../../config/password";
import { Check, Circle } from "lucide-react";

export default function ReglasPassword({ password = "", usuario = "", className = "" }) {
  return (
    <ul className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs ${className}`} aria-label="Requisitos de la contraseña">
      {reglasPassword(password, usuario).map((r) => (
        <li key={r.texto} className={`flex items-center gap-1.5 ${r.cumple ? "text-emerald-700" : "text-slate-500"}`}>
          {r.cumple ? <Check size={13} strokeWidth={3} /> : <Circle size={11} />}
          {r.texto}
          <span className="sr-only">{r.cumple ? "(cumple)" : "(pendiente)"}</span>
        </li>
      ))}
    </ul>
  );
}
