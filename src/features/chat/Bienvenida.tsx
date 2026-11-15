import { Clapperboard, Clock, TrendingUp, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { AvatarFidel } from '@/components/ui/AvatarFidel'

const SUGERENCIAS: Array<{ texto: string; Icono: LucideIcon }> = [
  { texto: '¿Qué publiqué mejor este mes?', Icono: TrendingUp },
  { texto: '¿A qué hora me conviene publicar?', Icono: Clock },
  { texto: '¿Qué formato me rinde más?', Icono: Clapperboard },
]

const SALIDA = [0.22, 1, 0.36, 1] as const
const escalonado = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.16 } },
}
const sube = {
  oculto: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: SALIDA } },
}

/** Primera pantalla del chat: Fidel se presenta y ofrece por dónde empezar. */
export function Bienvenida({ onElegir }: { onElegir: (pregunta: string) => void }) {
  return (
    <motion.div
      variants={escalonado}
      initial="oculto"
      animate="visible"
      className="flex min-h-full flex-col items-center justify-center gap-6 py-6 text-center"
    >
      {/* El único momento de autor: Fidel llega girando y deja un halo detrás. */}
      <div className="relative grid place-items-center">
        <motion.span
          aria-hidden="true"
          className="fidel-gradiente absolute inset-0 rounded-full blur-xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.7, 0.32], scale: [0.6, 1.5, 1.2] }}
          transition={{ duration: 1.1, ease: SALIDA, times: [0, 0.45, 1] }}
        />
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.4, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 17 }}
        >
          <AvatarFidel tamano="lg" className="size-16" />
        </motion.div>
      </div>
      <div className="space-y-2">
        <motion.h2 variants={sube} className="text-2xl font-extrabold tracking-tight">
          Hola, soy Fidel
        </motion.h2>
        <motion.p variants={sube} className="mx-auto max-w-sm text-muted">
          Miro cómo te fue en Instagram y te cuento qué conviene repetir. No publico ni cambio nada
          por vos.
        </motion.p>
      </div>
      <ul
        aria-label="Preguntas sugeridas"
        className="grid w-full max-w-2xl gap-2 text-left sm:grid-cols-3"
      >
        {SUGERENCIAS.map(({ texto, Icono }) => (
          <motion.li key={texto} variants={sube}>
            <button
              type="button"
              onClick={() => onElegir(texto)}
              className="group flex size-full min-h-14 items-center gap-3 rounded-lg border border-line bg-raised p-3 text-sm font-semibold shadow-card transition-[border-color,transform] duration-(--dur-fast) ease-brand hover:border-line-strong active:scale-[0.98] active:duration-(--dur-press) sm:flex-col sm:items-start sm:p-4"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
                <Icono className="size-4.5" aria-hidden="true" />
              </span>
              {texto}
            </button>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
