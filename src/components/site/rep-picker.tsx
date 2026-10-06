import { ArrowRight } from "lucide-react";

/** Formulário GET simples: funciona com ou sem JavaScript. */
export function RepPicker({ states }: { states: { uf: string; name: string; has: boolean }[] }) {
  return (
    <form action="/representantes" className="uf-picker">
      <label htmlFor="uf-home" className="sr-only">
        Estado
      </label>
      <select id="uf-home" name="uf" className="select" defaultValue="SP">
        {states.map((s) => (
          <option key={s.uf} value={s.uf}>
            {s.name} ({s.uf})
          </option>
        ))}
      </select>
      <button className="btn btn--lg" type="submit">
        Ver contato <ArrowRight className="btn__arrow" aria-hidden />
      </button>
    </form>
  );
}
