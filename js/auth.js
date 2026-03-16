/**
 * auth.js — Groeiboek authenticatie helpers
 * Verwacht dat `sb` (Supabase client) al beschikbaar is in de globale scope.
 */

/**
 * Registreert een nieuw account met e-mail en wachtwoord.
 * @param {string} email
 * @param {string} wachtwoord
 * @returns {{ user, error }}
 */
async function signUp(email, wachtwoord) {
  const { data, error } = await sb.auth.signUp({ email, password: wachtwoord });
  return { user: data?.user ?? null, error };
}

/**
 * Logt in met e-mail en wachtwoord.
 * Stuurt door naar dashboard.html bij succes.
 * @param {string} email
 * @param {string} wachtwoord
 * @returns {{ user, error }}
 */
async function signInWithPassword(email, wachtwoord) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: wachtwoord });
  if (!error) window.location.href = 'dashboard.html';
  return { user: data?.user ?? null, error };
}

/**
 * Stuurt een magic-link (OTP) naar het opgegeven e-mailadres.
 * @param {string} email
 * @returns {{ error }}
 */
async function signInWithOtp(email) {
  const { error } = await sb.auth.signInWithOtp({ email });
  return { error };
}

/**
 * Logt de huidige gebruiker uit en stuurt door naar inlog.html.
 */
async function uitloggen() {
  await sb.auth.signOut();
  window.location.href = 'inlog.html';
}

/**
 * Controleert de sessie. Stuurt door naar inlog.html als er geen sessie is.
 * @returns {import('@supabase/supabase-js').Session | null}
 */
async function vereisInlog() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) window.location.href = 'inlog.html';
  return session;
}
