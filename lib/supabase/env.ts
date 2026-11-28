// Aceita os nomes de variáveis criados pela integração Supabase da Vercel
// (chave "anon" antiga ou a nova "publishable").
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SUPABASE_READY = !!SUPABASE_URL && !!SUPABASE_KEY;
