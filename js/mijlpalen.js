/**
 * mijlpalen.js — Mijlpalen checklist, tijdlijn en opslaan
 * Verwacht: sb (Supabase client), window.mijlpalenKindId
 */

let alleMijlpalen = [];

// Tijdelijk opgeslagen state voor datum-modal
let _pendingMijlpaal = null;

// ─── Laden ────────────────────────────────────────────────────────────────────

async function laadMijlpalen(kindId) {
  window.mijlpalenKindId = kindId;

  const [{ data: templates }, { data: bereikt }] = await Promise.all([
    sb.from('mijlpalen_templates').select('*').order('volg', { ascending: true }),
    sb.from('mijlpalen').select('*').eq('kind_id', kindId).order('datum', { ascending: true }),
  ]);

  alleMijlpalen = bereikt || [];
  renderChecklist(templates || [], bereikt || []);
  renderTijdlijn(bereikt || []);
}

// ─── Checklist ────────────────────────────────────────────────────────────────

function renderChecklist(templates, bereikt) {
  const container = document.getElementById('mijlpalen-checklist');
  if (!container) return;

  const bereiktIds   = new Set(bereikt.map(b => b.template_id).filter(Boolean));
  const bereiktDatums = {};
  bereikt.forEach(b => { if (b.template_id) bereiktDatums[b.template_id] = b.datum; });

  if (templates.length === 0) {
    container.innerHTML = '<p style="color:var(--tekst-licht);font-size:0.9rem;font-weight:600">Geen templates gevonden.</p>';
    return;
  }

  container.innerHTML = templates.map(t => {
    const gedaan = bereiktIds.has(t.id);
    const datum  = bereiktDatums[t.id] ? formatDatumKort(bereiktDatums[t.id]) : '';
    const naam   = t.label || t.naam || '';
    const icoon  = t.emoji || t.icoon || '⭐';
    return `
      <div class="mijl-check-item ${gedaan ? 'gedaan' : ''}" id="mijl-item-${t.id}">
        <label class="mijl-check-label">
          <input type="checkbox" ${gedaan ? 'checked' : ''}
            onchange="toggleMijlpaal('${t.id}', '${escHtml(naam)}', '${escHtml(icoon)}', this)">
          <span class="mijl-icoon">${icoon}</span>
          <span class="mijl-naam">${escHtml(naam)}</span>
        </label>
        ${gedaan ? `<span class="mijl-datum-badge">${datum}</span>` : ''}
      </div>
    `;
  }).join('');
}

async function toggleMijlpaal(templateId, naam, icoon, checkbox) {
  if (checkbox.checked) {
    // Sla pending op en toon datum-modal
    _pendingMijlpaal = { templateId, naam, icoon, checkbox };
    document.getElementById('mijl-datum-naam').textContent = naam;
    document.getElementById('mijl-datum-input').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-mijlpaal-datum').classList.add('open');
  } else {
    const { error } = await sb.from('mijlpalen')
      .delete()
      .eq('kind_id', window.mijlpalenKindId)
      .eq('template_id', templateId);

    if (error) {
      mijlMelding('Fout bij verwijderen: ' + error.message, 'fout');
      checkbox.checked = true;
      return;
    }

    await laadMijlpalen(window.mijlpalenKindId);
  }
}

async function bevestigMijlpaalDatum() {
  if (!_pendingMijlpaal) return;

  const datum = document.getElementById('mijl-datum-input').value;
  if (!datum) {
    document.getElementById('mijl-datum-input').focus();
    return;
  }

  const { templateId, naam, checkbox } = _pendingMijlpaal;
  document.getElementById('modal-mijlpaal-datum').classList.remove('open');

  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('mijlpalen').insert({
    kind_id:     window.mijlpalenKindId,
    user_id:     user.id,
    template_id: templateId,
    naam,
    datum,
  });

  if (error) {
    mijlMelding('Fout bij opslaan: ' + error.message, 'fout');
    checkbox.checked = false;
  } else {
    await laadMijlpalen(window.mijlpalenKindId);
  }

  _pendingMijlpaal = null;
}

function annuleerMijlpaalDatum() {
  document.getElementById('modal-mijlpaal-datum').classList.remove('open');
  if (_pendingMijlpaal) {
    _pendingMijlpaal.checkbox.checked = false;
    _pendingMijlpaal = null;
  }
}

// ─── Eigen mijlpaal modal ─────────────────────────────────────────────────────

function openEigenMijlpaalModal() {
  document.getElementById('modal-mijlpaal').classList.add('open');
  document.getElementById('mijl-eigen-naam').value  = '';
  document.getElementById('mijl-eigen-datum').value = new Date().toISOString().split('T')[0];
  document.getElementById('mijl-eigen-icoon').value = '⭐';
  document.getElementById('mijl-eigen-melding').className = 'sectie-melding';
}

function sluitEigenMijlpaalModal() {
  document.getElementById('modal-mijlpaal').classList.remove('open');
}

async function eigenMijlpaalOpslaan() {
  const naam  = document.getElementById('mijl-eigen-naam').value.trim();
  const datum = document.getElementById('mijl-eigen-datum').value;
  const icoon = document.getElementById('mijl-eigen-icoon').value.trim() || '⭐';

  const meldingEl = document.getElementById('mijl-eigen-melding');

  if (!naam) {
    meldingEl.textContent = 'Vul een naam in.';
    meldingEl.className = 'sectie-melding fout';
    return;
  }
  if (!datum) {
    meldingEl.textContent = 'Kies een datum.';
    meldingEl.className = 'sectie-melding fout';
    return;
  }

  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('mijlpalen').insert({
    kind_id:     window.mijlpalenKindId,
    user_id:     user.id,
    naam,
    datum,
    template_id: null,
  });

  if (error) {
    meldingEl.textContent = 'Fout: ' + error.message;
    meldingEl.className = 'sectie-melding fout';
    return;
  }

  sluitEigenMijlpaalModal();
  await laadMijlpalen(window.mijlpalenKindId);
}

// ─── Tijdlijn ────────────────────────────────────────────────────────────────

function renderTijdlijn(bereikt) {
  const container = document.getElementById('mijlpalen-tijdlijn');
  if (!container) return;

  if (bereikt.length === 0) {
    container.innerHTML = '<p class="tl-leeg">Nog geen mijlpalen bereikt. Vink er een aan!</p>';
    return;
  }

  const gesorteerd = [...bereikt].sort((a, b) => a.datum.localeCompare(b.datum));

  container.innerHTML = gesorteerd.map(m => `
    <div class="mijl-tl-item">
      <div class="mijl-tl-dot">${m.icoon || '⭐'}</div>
      <div class="mijl-tl-inhoud">
        <div class="mijl-tl-naam">${escHtml(m.naam)}</div>
        <div class="mijl-tl-datum">${formatDatumKort(m.datum)}</div>
      </div>
    </div>
  `).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mijlMelding(tekst, type) {
  // Toon melding in de mijlpalen sectie als die bestaat
  const el = document.getElementById('groei-melding') || document.getElementById('melding');
  if (!el) return;
  el.textContent = tekst;
  el.className = 'sectie-melding ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function formatDatumKort(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
