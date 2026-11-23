# Proxy de Open Food Facts para Forja

Open Food Facts no deja buscar alimentos **por nombre** desde una app web (CORS). Este Worker de Cloudflare
(gratis, hasta 100 000 peticiones al día) hace la búsqueda por ti y solo responde a esta app.

## Desplegar (una vez, ~5 min)

1. Crea una cuenta gratis en <https://dash.cloudflare.com/sign-up> (no pide tarjeta).
2. En una terminal, dentro de esta carpeta:

   ```powershell
   cd worker
   npx wrangler login
   npx wrangler deploy
   ```

   `login` abre el navegador para que autorices. Al terminar, `deploy` imprime una URL como
   `https://forja-off-proxy.<tu-subdominio>.workers.dev`.
3. La app ya trae como valor de fábrica la URL del proxy de esta cuenta (`DEFAULT_OFF_PROXY` en `src/db/off.ts`). Si lo despliegas en otra cuenta, cámbiala ahí o pega tu URL en **Perfil → Búsqueda en internet**, **Probar** y **Guardar**.

## Probarlo

```powershell
curl "https://forja-off-proxy.<tu-subdominio>.workers.dev/search?q=pozole"
```

## Notas

- `ALLOWED_ORIGINS` en `wrangler.toml` limita qué páginas lo pueden usar. Si cambias el dominio de la app, agrégalo ahí.
- Las búsquedas se guardan 1 hora en la caché de Cloudflare.
- Solo manda a Open Food Facts el texto que buscas. No se guarda nada.
