# VoIP CRM - Unified Deployment

Plateforme CRM VoIP avec Dialer DTMF et Dashboard Admin.

## Structure

```
/                   - Backend Express (Node.js)
/frontend           - Frontend React (Vite)
/public             - Frontend compilé (servi par Express)
/src                - Backend source
```

## Déploiement Railway

Le Dockerfile multi-stage compile le frontend et lance le backend.

### Variables d'environnement requises

- `DATABASE_URL` - URL PostgreSQL
- `JWT_SECRET` - Clé secrète JWT
- `PORT` - Port du serveur (défaut: 3001)

### Identifiants par défaut

- **Admin**: admin / admin123
- **Agent**: agent1 / agent123

## Routes

- `/` - Dialer DTMF (accueil agent)
- `/admin` - Dashboard administrateur
- `/api/health` - Health check
