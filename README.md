# Common Ground

Comunidad privada y full-stack para los colaboradores de UNITEC USA Design, con toda la interfaz en español de Colombia.

## Funciones incluidas

- Inicio de sesión con Kimi y perfiles persistentes de colaboradores.
- Publicaciones por temas, fotos, captura con cámara y notas de voz.
- Me gusta y respuestas en cada publicación.
- Búsqueda de personas por nombre, cargo, ubicación e intereses fuera del trabajo.
- Mensajes individuales de texto, imagen y audio con actualización automática.
- Calendario de cumpleaños y aniversarios laborales, con publicaciones de celebración.
- Controles para ocultar el año de nacimiento y la ubicación.
- Asistente autenticado del manual de empresa, fundamentado en fuentes públicas de UNITEC USA Design.
- Respuestas en español de Colombia, enlaces exactos a las fuentes e historial privado por usuario.
- Manual navegable sobre la empresa, productos, logística, contactos y políticas públicas.
- Políticas, estándares, instructivos y borradores internos administrados por administradores.
- Directorio de contactos con responsabilidades, líneas de reporte, teléfonos y correos verificados.
- Sección de Formación para publicar cursos y documentos del personal mediante enlaces HTTP o HTTPS.
- Creación, edición, publicación, paso a borrador y eliminación de recursos por parte de administradores.
- Recuperación de respuestas tanto en páginas públicas como en recursos internos publicados.
- Navegación adaptable para escritorio y barra inferior para móviles.
- Perfiles y publicaciones de ejemplo claramente identificados para explorar la primera versión.

Los mensajes directos no tienen un panel para jefes. Esto no constituye una garantía de anonimato o cifrado extremo a extremo: los administradores del servicio pueden acceder a los datos almacenados cuando sea necesario.

## Ejecutar

```bash
npm install
npm run db:push
npx tsx db/seed.ts
npm run dev
```

La aplicación usa el puerto 3000. Verificación de producción:

```bash
npm run check
npm run build
npm start
```

## Datos, archivos y asistente

Los archivos multimedia se guardan en el almacenamiento de objetos de la plataforma; MySQL conserva únicamente las claves de los objetos y sus metadatos de propiedad. Las URL prefirmadas se generan cuando se necesitan y nunca se almacenan.

El asistente recupera fragmentos relevantes de una copia fechada de las fuentes públicas antes de llamar al modelo de IA de la plataforma. No entrena ni ajusta un modelo y no inventa conocimiento interno de RR. HH. o del personal. Las llamadas de IA usan credenciales exclusivas del servidor, consumen el cupo del propietario y no se repiten automáticamente después de un error. La copia del manual público fue consultada el 5 de noviembre de 2026; actualiza `api/lib/company-manual.ts` cuando cambie el sitio web.

Los administradores publican documentos, contactos, cursos y enlaces desde **Empresa → Agregar recurso**, o los conservan como borradores visibles solo para administradores. Los recursos internos están disponibles únicamente para colaboradores autenticados. No se precargan ni se adivinan políticas, personas, líneas de reporte o datos de contacto de la empresa.

## Variables de entorno

La plataforma normalmente inyecta estos valores en el entorno de ejecución; no deben publicarse en el navegador ni compartirse en conversaciones:

- `APP_ID`
- `APP_SECRET`
- `VITE_APP_ID`
- `VITE_KIMI_AUTH_URL`
- `DATABASE_URL`
- `KIMI_AUTH_URL`
- `KIMI_OPEN_URL`
- `OWNER_UNION_ID`
- `KIMI_AGENTGW_API_KEY`
- `KIMI_AGENTGW_BASE_URL`
- `KIMI_STORAGE_RESOURCE_ID`

`NODE_ENV=production` se usa en producción. `PORT` es opcional y tiene el valor predeterminado 3000. Guardar una versión crea una vista previa; publicar desde la tarjeta de versión es un paso independiente que realiza el propietario.
