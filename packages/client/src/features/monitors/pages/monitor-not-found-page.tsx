import { Link } from "@tanstack/react-router"
import { buttonStyles } from "#/core/design-system/button"

export function MonitorNotFoundPage() {
  return (
    <main className="flex flex-1 items-center">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-8 px-4 py-20">
        {/* Un rótulo de LEDs apagado: no hay nada que mostrar */}
        <p
          aria-hidden="true"
          className="font-dot text-[7rem] leading-none font-black tracking-tight text-neutral-800 select-none sm:text-[11rem]"
        >
          404
        </p>

        <div>
          <h1 className="text-2xl font-medium text-neutral-100">
            Este monitor no existe
          </h1>
          <p className="mt-2 max-w-prose text-neutral-400">
            Puede que se haya eliminado o que el enlace no sea correcto. Solo
            puedes ver los monitores de tu cuenta.
          </p>
        </div>

        <Link to="/" className={buttonStyles()}>
          Ver mis monitores
        </Link>
      </div>
    </main>
  )
}
