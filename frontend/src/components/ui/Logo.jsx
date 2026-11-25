// src/components/ui/Logo.jsx
// Imagen de un logotipo institucional: la que subió el administrador en
// Logotipos o, si no hay, la original. Acepta los mismos atributos que <img>.
//   <Logo clave="ayuntamiento" alt="H. Ayuntamiento de Atlacomulco" className="h-11 w-auto" />
import { useLogo } from "../../utils/logos";

export default function Logo({ clave, alt = "", ...props }) {
  const src = useLogo(clave);
  return <img src={src} alt={alt} {...props} />;
}
