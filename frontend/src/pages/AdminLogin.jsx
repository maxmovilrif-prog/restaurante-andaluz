import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PinPad from '../components/PinPad';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(pin) {
    setLoading(true);
    setError('');
    try {
      await login(pin);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <Link to="/" className="mb-8 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
        <ArrowLeft size={16} /> Volver al inicio
      </Link>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-white">
        <ShieldCheck size={26} />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Panel de Administración</h1>
      <p className="mb-8 text-sm text-neutral-500 dark:text-neutral-400">Introduce el PIN de administrador</p>
      <PinPad onSubmit={handleSubmit} disabled={loading} error={error} />
    </div>
  );
}
