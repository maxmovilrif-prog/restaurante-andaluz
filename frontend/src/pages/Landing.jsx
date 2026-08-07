import { Link } from 'react-router-dom';
import { UtensilsCrossed, Users, ShieldCheck } from 'lucide-react';

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="mb-10 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white">
          <UtensilsCrossed size={30} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Restaurante Andaluz</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Selecciona cómo quieres entrar</p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
        <Link
          to="/staff"
          className="group flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Users size={26} />
          </div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Modo Personal</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Acceso rápido para camareros y cocina — registra consumos internos con tu PIN.
          </p>
        </Link>

        <Link
          to="/admin"
          className="group flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Panel de Administración</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Inventario, facturas, informes y datos financieros — solo para el propietario.
          </p>
        </Link>
      </div>
    </div>
  );
}
