# Unitec Familia

Comunidad privada y full-stack para los colaboradores de UNITEC USA Design, con toda la interfaz en español de Colombia.

Repositorio: `Pablodd1/common-ground` (privado).

## Funciones incluidas

- Inicio de sesión con correo y contraseña (Supabase Auth), restringido a los dominios de la empresa; el correo del propietario recibe rol de administrador en su primer ingreso.
- Publicaciones por temas, fotos, captura con cámara y notas de voz.
- Me gusta y respuestas en cada publicación.
- Búsqueda de personas por nombre, cargo, ubicación e intereses fuera del trabajo.
- Mensajes individuales de texto, imagen y audio con actualización automática.
- Calendario de cumpleaños y aniversarios laborales, con publicaciones de celebración.
- Controles para ocultar el año de nacimiento y la ubicación.
- Asistente autenticado del manual de empresa (DeepSeek), fundamentado en fuentes públicas de UNITEC y recursos internos publicados.
- Manual, formación, cursos, documentos y directorio de contactos administrables.
- Creación, edición, publicación, paso a borrador y eliminación de recursos por administradores.
- Navegación adaptable para escritorio y móviles.

Los mensajes directos no tienen un panel para jefes. Esto **no** constituye una garantía de anonimato o cifrado extremo a extremo: los administradores del servicio pueden acceder a los datos almacenados cuando sea necesario.

## Arquitectura (Vercel + Supabase + DeepSeek)

- `src/`: React 19, TypeScript, Vite, Tailwind y shadcn/ui; todo en español.
- `api/index.ts`: única Vercel Function; adapta la aplicación Hono.
- `server/`: routers tRPC, autenticación propia con cookie de sesión firmada (JWT HS256), IA y acceso a datos.
- `db/`: esquema Drizzle y migraciones Postgres (Supabase).
- Supabase Postgres: perfiles, publicaciones, mensajes y metadatos de archivos (conexión por el pooler de transacciones, puerto 6543).
- Supabase Storage (bucket privado `media`): fotos y audios. Las cargas pasan por `POST /api/media` con tope de 4 MB (límite del cuerpo de solicitud de Vercel); el navegador reduce las fotos grandes antes de enviarlas. Las lecturas usan URL firmadas de corta duración.
- DeepSeek (API compatible con OpenAI): asistente del manual. La credencial vive solo en el servidor.

## Desarrollo local

Requisitos: Node.js 22+, un proyecto Supabase (Postgres + Auth + bucket privado `media`) y las variables de `.env.example`.

```bash
npm install
cp .env.example .env.local   # completa los valores; nunca los subas a GitHub
npm run db:migrate           # una sola vez, contra la base elegida
npm run dev                  # puerto 3000
```

Sembrado opcional de comunidad de ejemplo (perfiles ficticios marcados como demo; no recomendado en producción):

```bash
npm run seed
```

Verificación completa:

```bash
npm run check && npm run lint && npm test && npm run build
npm start                    # servidor Node con dist/boot.js
```

`npm run build:client` es el comando que usa Vercel. `npm run build` también genera `dist/boot.js` para ejecutar el mismo backend como servidor Node fuera de Vercel.

## Despliegue en Vercel

1. En Vercel, **Add New → Project** e importa `Pablodd1/common-ground` (configuración incluida: build `npm run build:client`, salida `dist/public`).
2. Agrega las variables de entorno del listado siguiente en **Settings → Environment Variables** (Production y Preview). Para la base de datos usa el pooler de transacciones: `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`.
3. Ejecuta las migraciones **una sola vez** desde tu equipo, apuntando `DATABASE_URL` a la conexión directa (`db.<ref>.supabase.co:5432`).
4. En Supabase: bucket privado `media` con límite de 12 MB y Auth por correo habilitado. La confirmación por correo no es necesaria: las cuentas se crean confirmadas por el servidor con la llave secreta.
5. Despliega y prueba: registro, ingreso, feed, publicación con foto y nota de voz, mensaje directo, recurso de empresa y respuesta del asistente.

## Variables de entorno

Nunca pegues los valores reales en GitHub, capturas o conversaciones.

| Variable | Uso | Visible en navegador |
|---|---|---|
| `APP_SECRET` | Firma JWT de las sesiones | No |
| `DATABASE_URL` | Postgres (Supabase, pooler 6543 en runtime) | No |
| `SUPABASE_URL` | URL del proyecto Supabase; la lee el servidor para Auth y Storage | No |
| `SUPABASE_SECRET_KEY` | Llave secreta: Auth admin y Storage | No |
| `SUPABASE_STORAGE_BUCKET` | Bucket privado de medios (por defecto `media`) | No |
| `ALLOWED_EMAIL_DOMAINS` | Dominios autorizados para crear cuenta e ingresar, separados por comas | No |
| `OWNER_EMAIL` | Este correo recibe rol admin en su primer ingreso (además pasa el filtro de dominios) | No |
| `DEEPSEEK_API_KEY` | Credencial de la pasarela de IA | No |
| `DEEPSEEK_BASE_URL` | Opcional; por defecto `https://api.deepseek.com/v1` | No |
| `DEEPSEEK_MODEL` | Opcional; por defecto `deepseek-chat` | No |

## Datos, archivos y asistente

Postgres conserva perfiles, publicaciones, mensajes y metadatos de archivos. Supabase Storage conserva los bytes de fotos y audios; las claves se almacenan, no las URL temporales.

El asistente recupera fragmentos de una copia fechada de fuentes públicas y de recursos internos publicados antes de llamar al modelo. No entrena ni ajusta un modelo y no inventa políticas, contactos o conocimiento interno. Las credenciales de IA permanecen en el servidor y las llamadas pueden generar costos. La copia pública fue consultada el 5 de noviembre de 2026; actualiza `server/lib/company-manual.ts` cuando cambie el sitio web.

Los administradores publican recursos desde **Empresa → Agregar recurso**. No se precargan ni se adivinan políticas, personas, líneas de reporte, teléfonos o datos de contacto.

## Consideraciones antes de abrirlo al personal

- El filtro por dominio de correo comprueba la identidad del buzón, no el empleo: cualquier persona con un correo `@unitecusadesign.com` puede entrar. Agrega una lista explícita de empleados antes de considerarlo estrictamente privado.
- No hay recuperación ni cambio de contraseña en la interfaz; hoy se gestiona por un administrador desde Supabase.
- Configura backups de la base de datos y una política para limpiar archivos subidos que nunca se adjuntan.
- Los datos reales del personal, dumps de base de datos, cookies y archivos `.env` están excluidos del repositorio.
