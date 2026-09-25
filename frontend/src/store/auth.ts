import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Demo auth — replace with your real auth API
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@studio.com': {
    password: 'studio2024',
    user: { id: '1', email: 'admin@studio.com', name: 'Administrador', role: 'admin' },
  },
  'op@studio.com': {
    password: 'dtf2024',
    user: { id: '2', email: 'op@studio.com', name: 'Operador', role: 'operator' },
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));

        const found = DEMO_USERS[email.toLowerCase()];
        if (!found || found.password !== password) {
          throw new Error('E-mail ou senha inválidos.');
        }

        set({
          user: found.user,
          token: `demo_token_${found.user.id}`,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'halftone-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);
