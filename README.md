# HalftonePro — DTF Studio

Aplicação web profissional para geração de halftones em 300 DPI, otimizada para impressão DTF.

## Stack

| Camada   | Tecnologia                               |
|----------|------------------------------------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind  |
| Backend  | Node.js 20 + Express + Sharp + Canvas   |
| Infra    | Docker + Portainer (build local na VPS)  |
| CI/CD    | GitHub Actions → Portainer Webhook       |

---

## Desenvolvimento local

```bash
git clone https://github.com/seu-usuario/halftone-app
cd halftone-app
docker compose -f docker-compose.dev.yml up --build
```

Acesse: http://localhost:3000
Login demo: `admin@studio.com` / `studio2024`

---

## Deploy na VPS com Portainer (build local)

> **Este projeto builda as imagens diretamente na VPS** a partir do código no GitHub.
> Não é necessário GHCR, Docker Hub nem nenhum registry externo.

### 1. Instalar Docker + Portainer na VPS

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Portainer
docker volume create portainer_data
docker run -d -p 9000:9000 --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

### 2. Criar a stack no Portainer

1. Acesse `http://IP-DA-VPS:9000`
2. Vá em **Stacks → Add stack**
3. Escolha **Repository**
4. Preencha:
   - **URL:** `https://github.com/seu-usuario/halftone-app`
   - **Compose path:** `portainer-stack.yml`
   - **Branch:** `main`
5. Em **Environment variables**, adicione (opcional):
   ```
   FRONTEND_URL=http://IP-DA-VPS
   ```
6. Ative **"Automatic updates"** → **Webhook**
7. Copie a **Webhook URL** gerada (vai usar no passo 3)
8. Clique em **Deploy the stack**

> O Portainer vai clonar o repo e executar `docker compose build` + `up` direto na VPS.
> O primeiro build demora ~5 minutos (instala dependências do Canvas/Sharp).

### 3. Configurar GitHub Secrets

No repositório → **Settings → Secrets and variables → Actions**:

| Secret | Valor |
|--------|-------|
| `PORTAINER_WEBHOOK_URL` | URL copiada do Portainer no passo 2 |
| `APP_HEALTH_URL` | `http://IP-DA-VPS:3001` |

### 4. Fluxo de atualização

```
git push origin main
    ↓
GitHub Actions dispara o webhook do Portainer
    ↓
Portainer faz git pull + docker compose build + up na VPS
    ↓
Containers atualizados sem downtime (graceful restart)
```

---

## Variáveis de ambiente

### Backend
| Variável       | Padrão                    | Descrição              |
|----------------|---------------------------|------------------------|
| `PORT`         | `3001`                    | Porta do servidor      |
| `FRONTEND_URL` | `http://localhost`        | URL do frontend (CORS) |
| `NODE_ENV`     | `production`              | Ambiente               |

### Frontend (build arg)
| Variável       | Padrão | Descrição          |
|----------------|--------|--------------------|
| `VITE_API_URL` | `/api` | Base URL da API    |

---

## Integrar com seu sistema de login existente

Edite `frontend/src/store/auth.ts` — substitua o bloco `login`:

```typescript
login: async (email, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Credenciais inválidas');
  const { token, user } = await res.json();
  set({ user, token, isAuthenticated: true });
},
```

---

## Arquitetura

```
/login  →  LoginPage  (canvas animado + form)
/       →  HalftonePage  (protegida)
           ├── Header        (logo + ações + menu)
           ├── DropZone      (drag & drop PNG/JPEG/TIFF)
           ├── ImagePreview  (zoom/pan + toggle original↔halftone)
           ├── ControlPanel  (presets + LPI/DPI + forma + UCR + CMYK)
           └── ExportBar     (info + exportar 300 DPI)
```
