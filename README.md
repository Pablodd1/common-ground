# Unitec Familia

Comunidad privada y full-stack para los colaboradores de UNITEC USA Design, con toda la interfaz en español de Colombia.

Repositorio: `Pablodd1/common-ground` (privado).

## Funciones incluidas

- Inicio de sesión con Kimi y perfiles persistentes de colaboradores.
- Publicaciones por temas, fotos, captura con cámara y notas de voz.
- Me gusta y respuestas en cada publicación.
- Búsqueda de personas por nombre, cargo, ubicación e intereses fuera del trabajo.
- Mensajes individuales de texto, imagen y audio con actualización automática.
- Calendario de cumpleaños y aniversarios laborales, con publicaciones de celebración.
- Controles para ocultar el año de nacimiento y la ubicación.
- Asistente autenticado del manual de empresa, fundamentado en fuentes públicas de UNITEC y recursos internos publicados.
- Manual, formación, cursos, documentos y directorio de contactos administrables.
- Creación, edición, publicación, paso a borrador y eliminación de recursos por administradores.
- Navegación adaptable para escritorio y móviles.

Los mensajes directos no tienen un panel para jefes. Esto **no** constituye una garantía de anonimato o cifrado extremo a extremo: los administradores del servicio pueden acceder a los datos almacenados cuando sea necesario.

## Arquitectura para Vercel

- `src/`: React 19, TypeScript, Vite, Tailwind y shadcn/ui.
- `api/index.ts`: única Vercel Function; adapta la aplicación Hono.
- `server/`: routers tRPC, autenticación, IA y acceso a datos.
- `db/`: esquema Drizzle y migraciones MySQL.
- `dist/public`: frontend estático generado por Vite.
- Vercel Blob privado: fotos y audios, con cargas directas del navegador mediante URL firmada y lecturas privadas de corta duración.

Las imágenes y notas de voz de hasta 12 MB no atraviesan la Vercel Function. Esto evita el límite de 4,5 MB por cuerpo de solicitud de Vercel. El servidor comprueba la sesión antes de firmar una carga y vuelve a comprobar tipo, tamaño, ruta y propietario antes de registrar el archivo.

## Desarrollo local

Requisitos: Node.js 22 o compatible, MySQL y las variables de `.env.example`.

```bash
npm install
cp .env.example .env.local
# Completa .env.local localmente; nunca lo subas a GitHub.
npm run db:migrate
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
npm start
```

`npm run build:client` es el comando que usa Vercel. `npm run build` también genera `dist/boot.js` para ejecutar el mismo backend como servidor Node fuera de Vercel.

## Importar y desplegar en Vercel

1. En Vercel, elige **Add New → Project** e importa `Pablodd1/common-ground`.
2. Vercel detectará Vite. La configuración incluida usa:
   - Build Command: `npm run build:client`
   - Output Directory: `dist/public`
   - Install Command: `npm install`
3. Agrega las variables siguientes en **Settings → Environment Variables**, para Production y, si usarás vistas previas, Preview.
4. Crea un almacén **Vercel Blob privado** y conéctalo al proyecto. Usa `BLOB_READ_WRITE_TOKEN` como credencial estática de servidor; no lo expongas con prefijo `VITE_`.
5. Configura MySQL externo y ejecuta las migraciones **una sola vez** desde tu entorno local o CI, apuntando a esa base de datos:

   ```bash
   npm run db:migrate
   ```

   No ejecutes `db:push --force` ni borres tablas. La base de datos debe aceptar conexiones TLS desde Vercel si tu proveedor lo exige.
6. En la aplicación OAuth de Kimi, autoriza este callback, sustituyendo el dominio real:

   ```text
   https://TU-DOMINIO.vercel.app/api/oauth/callback
   ```

   Si agregas un dominio personalizado o usas previews con otro dominio, registra también esos callbacks. `APP_ID` y `VITE_APP_ID` deben contener el mismo identificador; `KIMI_AUTH_URL` y `VITE_KIMI_AUTH_URL`, la misma URL de autenticación.
7. Despliega desde Vercel y prueba: login, lectura del feed, publicación, foto, nota de voz, mensaje directo, curso/documento y respuesta del asistente.

El repositorio queda listo para importar, pero **un despliegue solo existe después de que Vercel complete ese proceso correctamente**.

## Variables de entorno

Nunca pegues los valores reales en GitHub, capturas o conversaciones.

| Variable | Uso | Visible en navegador |
|---|---|---|
| `APP_ID` | Aplicación OAuth | No |
| `APP_SECRET` | Secreto OAuth y firma JWT de sesiones | No |
| `KIMI_AUTH_URL` | Intercambio OAuth y JWKS en servidor | No |
| `KIMI_OPEN_URL` | Consulta del perfil de usuario | No |
| `OWNER_UNION_ID` | Otorga rol admin al propietario en su primer login | No |
| `VITE_APP_ID` | Mismo ID OAuth para iniciar login | Sí, no es secreto |
| `VITE_KIMI_AUTH_URL` | URL del servidor de autorización | Sí, no es secreta |
| `DATABASE_URL` | Cadena MySQL persistente | No |
| `KIMI_AGENTGW_API_KEY` | Credencial de la pasarela de IA | No |
| `KIMI_AGENTGW_BASE_URL` | URL de la pasarela OpenAI-compatible | No |
| `BLOB_READ_WRITE_TOKEN` | Firma y verificación de Vercel Blob privado | No |

Vercel establece `NODE_ENV=production`; no hace falta `PORT` en Vercel. Si conectas Blob con OIDC, Vercel puede administrar `BLOB_STORE_ID` y `VERCEL_OIDC_TOKEN`; la opción documentada aquí usa el token estático para que el mismo flujo funcione también en local.

## Datos, archivos y asistente

MySQL conserva perfiles, publicaciones, mensajes y metadatos de archivos. Vercel Blob conserva los bytes de fotos y audios. Las claves se almacenan, no las URL temporales. Los archivos creados anteriormente en el almacenamiento gestionado por Kimi **no se migran automáticamente** a Vercel Blob.

El asistente recupera fragmentos de una copia fechada de fuentes públicas y de recursos internos publicados antes de llamar al modelo. No entrena ni ajusta un modelo y no inventa políticas, contactos o conocimiento interno. Las credenciales de IA permanecen en el servidor y las llamadas pueden generar costos. La copia pública fue consultada el 5 de noviembre de 2026; actualiza `server/lib/company-manual.ts` cuando cambie el sitio web.

Los administradores publican recursos desde **Empresa → Agregar recurso**. No se precargan ni se adivinan políticas, personas, líneas de reporte, teléfonos o datos de contacto.

## Consideraciones antes de abrirlo al personal

- Kimi OAuth comprueba identidad, pero no demuestra por sí solo que una persona sea empleada de UNITEC. Restringe el acceso en el proveedor OAuth o agrega una lista/autorización de empleados antes de considerarlo estrictamente privado.
- La pasarela de IA y los endpoints OAuth deben ser accesibles desde Vercel; las credenciales de una plataforma no garantizan portabilidad o permisos en otro hosting.
- Vercel, MySQL, Blob, la IA y el proveedor OAuth pueden facturar según su uso y plan.
- Configura backups del MySQL externo y una política para limpiar cargas que se suban pero nunca se adjunten.
- Los datos reales del personal, dumps de base de datos, cookies y archivos `.env` están excluidos del repositorio.
