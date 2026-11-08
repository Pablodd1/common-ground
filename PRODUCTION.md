# Unitec Familia — Runbook de producción

Estado: **en producción (demo)** — https://common-ground-rust.vercel.app
Repo: `Pablodd1/common-ground` (privado) · Vercel: proyecto `common-ground` · Supabase: `yyevaqfosaduuhokguln` (us-east-1)

## Verificación continua (ya activa)

| Qué | Dónde | Frecuencia |
|---|---|---|
| Suite completa de smoke (48 chequeos: sesión, feed, asistente IA, fotos, administración, menciones, tickets, límite de intentos) | GitHub Actions «Smoke de producción» + `npm run smoke` local | Cada 6 horas |
| CI (tipos, lint, tests, build) | GitHub Actions «CI» | En cada push/PR |
| Respaldo `pg_dump` (esquema + datos, artefacto de 90 días) | GitHub Actions «Respaldo de base de datos» | Domingos 04:30 UTC (o manual) |
| Limpieza de archivos huérfanos | GitHub Actions «Limpieza» → `POST /api/cron/cleanup` | Diario 03:17 UTC |

Para correr el smoke a mano: `BASE_URL=https://… SMOKE_EMAIL=… SMOKE_PASSWORD=… npm run smoke`.

## Menciones, tickets y avisos (nuevo)

- **@menciones**: cada cuenta tiene un `@usuario` único (editable en el perfil). Escribir `@` en publicaciones, comentarios o mensajes abre el autocompletado; la persona recibe aviso en la campana y, según sus preferencias, por correo y Telegram.
- **Telegram**: el usuario conecta su chat desde su perfil (Perfil → Avisos → Conectar Telegram → abrir el enlace de t.me). Requiere una sola configuración del administrador (ver abajo).
- **`/ticket` (o `#ticket`)**: en el cuadro de publicaciones abre un ticket de soporte. Suena la campana de todos los administradores y salta el Telegram/correo del propietario. La bandeja vive en la pestaña **Empresa** (admin: resolver; usuarios: ver los suyos).

### Activar Telegram (una sola vez, 3 minutos)

1. En Telegram, hablar con **@BotFather** → `/newbot` → nombre y usuario del bot.
2. Copiar el token y agregarlo en Vercel como `TELEGRAM_BOT_TOKEN` (Production+Preview).
3. Opcional (aviso directo al dueño sin esperar al primer login): escribirle al bot desde tu Telegram, obtener tu chat id (p. ej. con @userinfobot) y agregar `TELEGRAM_OWNER_CHAT_ID`.
4. Desplegar de nuevo. El webhook se registra solo la primera vez que un usuario genere su enlace.

Sin token, todo lo demás sigue funcionando: la campana interna siempre registra el aviso y el smoke verifica la degradación limpia.

### Correo (opcional)

Agregar `RESEND_API_KEY` (y `RESEND_FROM` con dominio verificado) en Vercel. Sin dominio verificado, Resend solo entrega al dueño de la cuenta.

## Operaciones comunes

- **Desplegar:** push a `main` (Vercel auto-despliega) o `vercel deploy --prod`.
- **Migraciones:** `DATABASE_URL=<conexión directa 5432> npm run db:migrate` desde el equipo, una sola vez por migración. Nunca contra el pooler 6543.
- **Restaurar respaldo:** descargar el artefacto del workflow → `pg_restore --clean --if-exists --no-owner -d "<DATABASE_URL directa>" archivo.dump`. **Practica esto una vez antes de necesitarlo.**
- **Contraseña olvidada:** no hay flujo por correo todavía; un admin la restablece en Supabase → Authentication → Users. El usuario puede cambiarla luego en su perfil.
- **Baja de empleado:** pestaña Personas (como admin) → Desactivar. Bloquea el ingreso, cierra sus sesiones activas y lo saca del directorio; su contenido queda intacto. Reactivar es reversible.
- **Rotar `APP_SECRET`:** invalida todas las sesiones (todos deben volver a ingresar). Seguro en cualquier momento.

## Postura de seguridad actual

- RLS habilitado en las 9 tablas (sin políticas): la API entra como rol `postgres` y el resto de la superficie REST de Supabase no expone nada.
- Contraseñas y sesiones viven solo en el servidor; el bundle del navegador no contiene ninguna llave.
- CSP estricta, anti-clickjacking, noindex, robots.txt — comunidad privada no indexable.
- Límite de 8 intentos de ingreso por IP+correo cada 5 minutos (mejor esfuerzo en serverless) + límites propios de Supabase.
- Correos de `ALLOWED_EMAIL_DOMAINS` (y `OWNER_EMAIL`) son los únicos que pueden crear cuenta.

## Recomendaciones (en orden)

### Antes de abrirlo a todo el personal
1. **Dominio propio** (p..j. `familia.unitecusadesign.com`) y SSL: Vercel → Settings → Domains. La CSP de `vercel.json` ya incluye el origen de Supabase; no requiere cambios.
2. **Lista explícita de empleados.** Hoy cualquier correo `@unitecusadesign.com` se auto-registra. Para privacidad real: aprobar cuentas una a una (admin) o cargar una lista de correos válidos antes del registro.
3. **Rotar credenciales compartidas por chat** (DeepSeek, `sb_secret`, DB, `APP_SECRET`) y dejarlas solo en Vercel/GitHub secrets.
4. **Recuperación de contraseña por correo:** configurar Site URL y plantillas en Supabase Auth (necesita acceso al panel; el flujo de cambio de contraseña ya existe dentro de la app).
5. **PITR o backups administrados de Supabase** además del pg_dump semanal (el plan gratuito solo retiene días).

### Siguientes mejoras de producto
6. Editar/eliminar mensajes directos propios y notificaciones (hoy solo publicaciones).
7. Limpieza programada de archivos subidos que nunca se adjuntan (hoy se quedan en Storage).
8. Métricas de uso (ingresos, publicaciones, uso del asistente) — un panel mínimo para RR. HH.
9. Los cumpleaños del directorio dependen de que cada persona complete su perfil; un recordatorio amable en el primer ingreso ayudaría.

### Si crece el uso
10. Paginación real del feed (hoy top 50) y del historial de mensajes.
11. Subidas directas al bucket (4 MB hoy, proxy): requiere claves S3 de Supabase Storage o una llave pública válida.
12. Cola de trabajos para el asistente si el volumen de preguntas crece (hoy es síncrono, tope 60 s por llamada).
