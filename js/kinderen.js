/**
 * kinderen.js — Groeiboek kind-beheer helpers
 * Verwacht dat `sb` (Supabase client) al beschikbaar is in de globale scope.
 * Exporteert state via window.actieveKindId zodat andere scripts hem kunnen lezen.
 */

window.actieveKindId = null;

/**
 * Laadt alle kinderen van de ingelogde gebruiker.
 * Vult de <select id="kind-select"> op de pagina (als aanwezig).
 * Roept optioneel een callback aan met het eerste kind.
 * @param {function(object): void} [onKindGeladen] - Callback met het actieve kind-object
 * @returns {Array} kinderen
 */
async function laadKinderen(onKindGeladen) {
  const { data: kinderen, error } = await sb
    .from('kinderen')
    .select('*')
    .order('created_at');

  if (error) { console.error('kinderen laden mislukt:', error.message); return []; }

  const sel = document.getElementById('kind-select');
  if (sel) {
    sel.innerHTML = '';
    if (!kinderen || kinderen.length === 0) {
      sel.innerHTML = '<option>Geen kinderen</option>';
    } else {
      kinderen.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k.id;
        opt.textContent = k.naam;
        sel.appendChild(opt);
      });
    }
  }

  if (kinderen && kinderen.length > 0) {
    window.actieveKindId = kinderen[0].id;
    if (typeof onKindGeladen === 'function') onKindGeladen(kinderen[0]);
  }

  return kinderen ?? [];
}

/**
 * Wordt aangeroepen als de gebruiker een ander kind kiest in de <select>.
 * Haalt het geselecteerde kind op en roept de callback aan.
 * @param {function(object): void} [onWisselen] - Callback met het nieuwe kind-object
 */
async function kindWisselen(onWisselen) {
  const sel = document.getElementById('kind-select');
  if (!sel) return;
  window.actieveKindId = sel.value;
  const { data: kind, error } = await sb
    .from('kinderen')
    .select('*')
    .eq('id', window.actieveKindId)
    .single();
  if (error) { console.error('kind ophalen mislukt:', error.message); return; }
  if (typeof onWisselen === 'function') onWisselen(kind);
}

/**
 * Slaat een nieuw kind op in de Supabase tabel `kinderen`.
 * @param {{ naam: string, geboortedatum: string, geslacht: string }} gegevens
 * @returns {{ kind, error }}
 */
async function kindOpslaan({ naam, geboortedatum, geslacht }) {
  if (!naam || !geboortedatum) return { kind: null, error: { message: 'Naam en geboortedatum zijn verplicht.' } };

  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb
    .from('kinderen')
    .insert({ naam, geboortedatum, geslacht, user_id: user.id })
    .select()
    .single();

  return { kind: data ?? null, error };
}

/**
 * Verwijdert een kind op basis van id.
 * @param {string} kindId
 * @returns {{ error }}
 */
async function kindVerwijderen(kindId) {
  const { error } = await sb.from('kinderen').delete().eq('id', kindId);
  return { error };
}
