#!/usr/bin/env node
// Crea (o actualiza) el bucket PRIVADO de Supabase Storage para fotos y notas de voz.
// Uso: npm run setup:supabase   (lee .env.local / .env)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "media";
if (!url || !key) {
  console.error("❌ Faltan SUPABASE_URL y SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const options = {
  public: false,
  fileSizeLimit: 12_000_000,
  allowedMimeTypes: [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav",
  ],
};

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: existing } = await supabase.storage.getBucket(bucket);
const { error } = existing
  ? await supabase.storage.updateBucket(bucket, options)
  : await supabase.storage.createBucket(bucket, options);
if (error) {
  console.error(`❌ No se pudo preparar el bucket "${bucket}": ${error.message}`);
  process.exit(1);
}
if (existing?.public) console.log(`⚠️  El bucket "${bucket}" era público; ahora es privado.`);
console.log(`✅ Bucket privado "${bucket}" listo (máx. 12 MB; imágenes y audio).`);
