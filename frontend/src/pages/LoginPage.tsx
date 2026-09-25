import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';
import HalftoneBg from '../components/HalftoneBg';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-screen-900">
      {/* Animated dot grid background */}
      <HalftoneBg />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-ink-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-dot-600/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-ink-500/20 border border-ink-500/30 ink-glow mb-4">
            <Layers size={28} className="text-ink-300" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">HalftonePro</h1>
          <p className="text-screen-100 text-sm mt-1 font-mono">DTF Studio</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <p className="text-sm text-screen-100 mb-6">Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-screen-100 mb-2 font-medium">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full bg-screen-800 border border-screen-400 rounded-xl px-4 py-3 text-sm text-white placeholder:text-screen-200 focus:outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-screen-100 mb-2 font-medium">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-screen-800 border border-screen-400 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-screen-200 focus:outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-screen-100 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-ink-500 hover:bg-ink-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-[0.98] ink-glow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingDots /> Entrando
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-screen-200 mt-6">
            Problemas para acessar? Fale com o administrador.
          </p>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-screen-200 mt-4 font-mono opacity-60">
          demo: admin@studio.com / studio2024
        </p>
      </motion.div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-white rounded-full animate-dot-pulse"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}
