# Unitec Familia

Comunidad privada y full-stack para los colaboradores de UNITEC USA Design, con toda la interfaz en español de Colombia.

Repositorio: `Pablodd1/common-ground` (privado).

## Funciones incluidas

- Inicio de sesión sin contraseña (enlace por correo con Supabase Auth), solo para correos de los dominios de la empresa.
- Publicaciones por temas, fotos, captura con cámara y notas de voz.
- Me gusta y respuestas en cada publicación.
- Cada persona puede eliminar sus publicaciones y respuestas; los administradores pueden moderar cualquiera.
- Búsqueda de personas por nombre, cargo, ubicación e intereses fuera del trabajo.
- Mensajes individuales de texto, imagen y audio con actualización automática.
- Calendario de cumpleaños y aniversarios laborales, con publicaciones de celebración.
- Controles para ocultar el año de nacimiento y la ubicación.
- Asistente autenticado del manual de empresa, fundamentado en fuentes públicas de UNITEC y recursos internos publicados.
- Manual, formación, cursos, documentos y directorio de contactos administrables.
- Aprendizaje del asistente: el personal valora cada respuesta (👍/👎) y los administradores ven, de forma anónima, qué preguntas no tuvieron respuesta o fueron poco útiles, para publicar el recurso que falta con un clic (**Empresa → Aprendizaje**).
- Creación, edición, publicación, paso a borrador y eliminación de recursos por administradores.
- Navegación adaptable para escritorio y móviles.

Los mensajes directos no tienen un panel para jefes. Esto **no** constituye una garantía de anonimato o cifrado extremo a extremo: los administradores del servicio pueden acceder a los datos almacenados cuando sea necesario.

## Arquitectura (Vercel + Supabase + DeepSeek)

- `src/`: React 19, TypeScript, Vite, Tailwind y shadcn/ui.
- `api/index.ts`: única Vercel Function; adapta la aplicación Hono.
- `server/`: routers tRPC, autenticación, IA y acceso a datos.
- `db/`: esquema Drizzle y migraciones de **Postgres (Supabase)**.
- **Supabase Auth**: inicio de sesión con enlace por correo. El navegador envía el token de Supabase en cada solicitud; el servidor lo valida con Supabase y solo acepta correos de `ALLOWED_EMAIL_DOMAINS`.
- **Supabase Storage**: bucket privado para fotos y notas de voz. El navegador sube cada archivo directamente con una URL firmada de un solo uso (no pasa por la Vercel Function, que tiene un límite de 4,5 MB); el servidor verifica tamaño, tipo y dueño, y entrega URL de lectura de 5 minutos.
- **DeepSeek**: el asistente usa la API de DeepSeek (compatible con OpenAI) solo desde el servidor.
- Todas las tablas tienen **RLS activado sin políticas**: la clave pública del navegador no puede leer ni escribir datos por la API de Supabase; todo pasa por el servidor.

## Configurar Supabase (una sola vez)

1. Crea un proyecto en Supabase (elige una región cercana a la de Vercel, por ejemplo `us-east-1`).
2. **Project Settings → API Keys**: copia la URL del proyecto, la clave pública (`sb_publishable_…`) y crea/copia una clave secreta (`sb_secret_…`).
3. **Connect → Transaction pooler**: copia la cadena (puerto `6543`) para `DATABASE_URL`. Para migrar puedes usar la del **Session pooler** (`5432`) en `DIRECT_DATABASE_URL`.
4. **Authentication → URL Configuration**:
   - *Site URL*: `https://TU-DOMINIO.vercel.app`
   - *Redirect URLs*: agrega `https://TU-DOMINIO.vercel.app`, tu dominio propio si lo usas y `http://localhost:3000` para desarrollo.
5. **Authentication → Emails → Magic Link**: pega la plantilla en español de [`docs/supabase-email-magic-link.html`](docs/supabase-email-magic-link.html) y el asunto «Tu enlace para entrar a Unitec Familia». Para correos confiables en producción, configura un SMTP propio en **Authentication → Emails → SMTP Settings**: el servicio de correo incluido en Supabase tiene un límite bajo de envíos y es solo para pruebas.
6. Con las variables en `.env.local`:

   ```bash
   npm run check:env        # revisa las variables
   npm run db:migrate       # crea las tablas y activa RLS
   npm run setup:supabase   # crea el bucket privado "media" (12 MB, imágenes y audio)
   ```

## Desarrollo local

Requisitos: Node.js 22 y un proyecto de Supabase (o Postgres local para las pruebas).

```bash
npm install
cp .env.example .env.local
# Completa .env.local localmente; nunca lo subas a GitHub.
npm run check:env
npm run db:migrate
npm run setup:supabase
npm run dev
```

La aplicación usa el puerto 3000. El sembrado de demostración es opcional y **no recomendado para producción**:

```bash
npx tsx db/seed.ts
```

Verificación completa:

```bash
npm run check
npm run build
```

Pruebas de integración (Postgres local; la base indicada se **borra y se recrea** con las migraciones, por eso su nombre debe terminar en `_test`). Supabase Auth y Storage se simulan:

```bash
TEST_DATABASE_URL=postgres://usuario:clave@127.0.0.1:5432/unitec_test npm test
```

Sin `TEST_DATABASE_URL`, las pruebas de base de datos se omiten. CI las ejecuta siempre contra Postgres 16.

## Desplegar en Vercel

1. En Vercel, elige **Add New → Project** e importa `Pablodd1/common-ground`. La configuración incluida usa Build Command `npm run build:client`, Output Directory `dist/public` e Install Command `npm install`.
2. Agrega las variables de la tabla siguiente en **Settings → Environment Variables** (Production y, si usarás vistas previas, Preview). Las variables `VITE_*` se incrustan al compilar: si las cambias, vuelve a desplegar.
3. Ejecuta `npm run db:migrate` y `npm run setup:supabase` **una vez** desde tu equipo o CI apuntando al proyecto de Supabase.
4. Despliega y prueba: enlace de acceso (con un correo de la empresa y con uno externo, que debe ser rechazado), feed, publicación, foto, nota de voz, mensaje directo, recurso y respuesta del asistente.

## Variables de entorno

Nunca pegues los valores reales en GitHub, capturas o conversaciones. Comprueba que estén completas y coherentes (no muestra los valores):

```bash
npm run check:env           # lee .env.local y .env
npm run check:env -- --ci   # solo variables del entorno actual
```

| Variable | Uso | Visible en navegador |
|---|---|---|
| `DATABASE_URL` | Postgres de Supabase, **Transaction pooler** (puerto 6543) | No |
| `DIRECT_DATABASE_URL` | Opcional, solo para migraciones (Session pooler, 5432) | No |
| `DATABASE_SSL_CA` | Opcional: certificado de Supabase para verificar TLS | No |
| `SUPABASE_URL` | URL del proyecto (Auth y Storage en servidor) | No |
| `SUPABASE_SECRET_KEY` | Clave secreta `sb_secret_…` (o `SUPABASE_SERVICE_ROLE_KEY` heredada) | **Nunca** |
| `SUPABASE_STORAGE_BUCKET` | Bucket privado; por defecto `media` | No |
| `VITE_SUPABASE_URL` | Misma URL del proyecto | Sí |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública `sb_publishable_…` | Sí, no es secreta |
| `ALLOWED_EMAIL_DOMAINS` | Dominios que pueden entrar, separados por comas, sin `@` | No |
| `OWNER_EMAIL` | Correo(s) que reciben rol de administrador | No |
| `DEEPSEEK_API_KEY` | Clave de la API de DeepSeek | No |
| `DEEPSEEK_MODEL` | Opcional; por defecto `deepseek-flash` | No |
| `DEEPSEEK_BASE_URL` | Opcional; por defecto `https://api.deepseek.com` | No |

Recomendaciones:

- Usa la **clave secreta nueva** (`sb_secret_…`). Supabase retira las claves `anon`/`service_role` a finales de 2026; mientras tanto, ambas funcionan aquí.
- `DATABASE_URL` debe ser el **pooler**: la conexión directa `db.<ref>.supabase.co` es solo IPv6 y Vercel no la alcanza.
- `ALLOWED_EMAIL_DOMAINS` nunca debe incluir correos públicos (gmail, hotmail…). La coincidencia es exacta: `unitec.com` no admite `mail.unitec.com`; agrégalo aparte si lo necesitas.
- Configura `OWNER_EMAIL` antes de tu primer acceso para recibir el rol de administrador.
- Usa un proyecto de Supabase distinto para Preview si no quieres mezclar datos de prueba con datos reales.
- En DeepSeek, define un límite de gasto y recarga saldo: sin saldo (error 402) el asistente muestra un aviso en español.

## Datos, archivos y asistente

Postgres (Supabase) conserva perfiles, publicaciones, mensajes y metadatos de archivos. Supabase Storage conserva los bytes de fotos y audios en un bucket privado. Se guardan las rutas, no las URL temporales. Los datos y archivos de la versión anterior (MySQL de Kimi / Vercel Blob) **no se migran automáticamente**.

El asistente no se entrena con las conversaciones: mejora cuando un administrador publica recursos. Las preguntas al asistente y sus valoraciones se muestran a los administradores de forma anónima; los mensajes directos entre colegas nunca se usan para esto. La búsqueda trata igual singular y plural en español (por ejemplo, «vacación» y «vacaciones») e ignora tildes.

El asistente recupera fragmentos de una copia fechada de fuentes públicas y de recursos internos publicados antes de llamar al modelo. No entrena ni ajusta un modelo y no inventa políticas, contactos o conocimiento interno. La clave de DeepSeek permanece en el servidor y cada respuesta genera costos en tu cuenta de DeepSeek. La copia pública fue consultada el 5 de noviembre de 2026; actualiza `server/lib/company-manual.ts` cuando cambie el sitio web.

Los administradores publican recursos desde **Empresa → Agregar recurso**. No se precargan ni se adivinan políticas, personas, líneas de reporte, teléfonos o datos de contacto.

## Consideraciones antes de abrirlo al personal

- El dominio de correo demuestra que la persona tiene un buzón de la empresa, no que siga trabajando allí: al desactivar un buzón, elimina también su usuario en **Supabase → Authentication → Users**.
- Supabase crea la cuenta de Auth al pedir el enlace aunque el dominio no esté autorizado (la app la rechaza al entrar). Para bloquearlo desde Supabase, agrega un *Before User Created* Auth Hook que valide el dominio.
- Vercel, Supabase y DeepSeek pueden facturar según su uso y plan.
- Revisa los backups de Supabase según tu plan y define una política para limpiar cargas que se suban pero nunca se adjunten.
- Los datos reales del personal, dumps de base de datos, cookies y archivos `.env` están excluidos del repositorio.
