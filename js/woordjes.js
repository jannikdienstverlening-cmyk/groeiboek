/**
 * woordjes.js — Eerste woordjes opslaan, ophalen en filteren
 * Verwacht: sb (Supabase client), window.woordjesKindId
 */

let alleWoordjes = [];

// ─── Opslaan ─────────────────────────────────────────────────────────────────

async function woordjeOpslaan() {
  const woord = document.getElementById('woord-inp').value.trim();
  const datum = document.getElementById('woord-datum').value;

  if (!woord) return woordjesFeedback('Vul een woordje in.', 'fout');
  if (!datum) return woordjesFeedback('Kies een datum.', 'fout');

  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('woordjes').insert({
    kind_id: window.woordjesKindId,
    user_id: user.id,
    woord,
    datum,
  });

  if (error) return woordjesFeedback('Fout: ' + error.message, 'fout');

  document.getElementById('woord-inp').value = '';
  woordjesFeedback('✅ Opgeslagen!', 'ok');
  await laadWoordjes(window.woordjesKindId);
}

// ─── Laden & renderen ─────────────────────────────────────────────────────────

async function laadWoordjes(kindId) {
  window.woordjesKindId = kindId;

  const { data, error } = await sb
    .from('woordjes')
    .select('*')
    .eq('kind_id', kindId)
    .order('datum', { ascending: true });

  if (error) { console.error('woordjes laden mislukt:', error.message); return; }

  alleWoordjes = data || [];
  renderWoordjes(alleWoordjes);
}

function renderWoordjes(lijst) {
  const container = document.getElementById('woordjes-lijst');
  if (!container) return;

  if (lijst.length === 0) {
    container.innerHTML = '<p class="woordjes-leeg">Nog geen woordjes — voeg het eerste toe!</p>';
    return;
  }

  container.innerHTML = lijst.map(w => `
    <div class="woord-chip">
      <span class="woord-tekst">${escHtmlW(w.woord)}</span>
      <span class="woord-datum">${formatDatumKortW(w.datum)}</span>
    </div>
  `).join('');
}

// ─── Zoeken ──────────────────────────────────────────────────────────────────

function filterWoordjes() {
  const zoek = (document.getElementById('woord-zoek').value || '').toLowerCase();
  if (!zoek) { renderWoordjes(alleWoordjes); return; }
  renderWoordjes(alleWoordjes.filter(w => w.woord.toLowerCase().includes(zoek)));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function woordjesFeedback(tekst, type) {
  const el = document.getElementById('woord-melding');
  if (!el) return;
  el.textContent = tekst;
  el.className = 'sectie-melding ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function formatDatumKortW(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtmlW(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
