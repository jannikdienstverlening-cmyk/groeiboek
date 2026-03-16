/**
 * mijlpalen.js — Mijlpalen checklist, tijdlijn en opslaan
 * Verwacht: sb (Supabase client), window.mijlpalenKindId
 */

let alleMijlpalen = []; // bereikt door dit kind

// ─── Laden ────────────────────────────────────────────────────────────────────

async function laadMijlpalen(kindId) {
  window.mijlpalenKindId = kindId;

  const [{ data: templates }, { data: bereikt }] = await Promise.all([
    sb.from('mijlpalen_templates').select('*').order('volgorde', { ascending: true }),
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

  const bereiktIds = new Set(bereikt.map(b => b.template_id).filter(Boolean));
  const bereiktDatums = {};
  bereikt.forEach(b => { if (b.template_id) bereiktDatums[b.template_id] = b.datum; });

  if (templates.length === 0) {
    container.innerHTML = '<p style="color:#aaa;font-size:0.9rem">Geen templates gevonden.</p>';
    return;
  }

  container.innerHTML = templates.map(t => {
    const gedaan = bereiktIds.has(t.id);
    const datum  = bereiktDatums[t.id] ? formatDatumKort(bereiktDatums[t.id]) : '';
    return `
      <div class="mijl-check-item ${gedaan ? 'gedaan' : ''}" id="mijl-item-${t.id}">
        <label class="mijl-check-label">
          <input type="checkbox" ${gedaan ? 'checked' : ''}
            onchange="toggleMijlpaal('${t.id}', '${escHtml(t.naam)}', '${escHtml(t.icoon || '⭐')}', this)">
          <span class="mijl-icoon">${t.icoon || '⭐'}</span>
          <span class="mijl-naam">${escHtml(t.naam)}</span>
        </label>
        ${gedaan ? `<span class="mijl-datum-badge">${datum}</span>` : ''}
      </div>
    `;
  }).join('');
}

async function toggleMijlpaal(templateId, naam, icoon, checkbox) {
  const item = document.getElementById(`mijl-item-${templateId}`);

  if (checkbox.checked) {
    // Datum picker tonen inline
    const vandaag = new Date().toISOString().split('T')[0];
    const datum = prompt(`Op welke datum bereikte je kind "${naam}"?\n(formaat: JJJJ-MM-DD)`, vandaag);
    if (!datum) { checkbox.checked = false; return; }

    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('mijlpalen').insert({
      kind_id: window.mijlpalenKindId,
      user_id: user.id,
      template_id: templateId,
      naam,
      icoon,
      datum,
    });
    if (error) { alert('Fout: ' + error.message); checkbox.checked = false; return; }
  } else {
    // Verwijder uit bereikt
    const { error } = await sb.from('mijlpalen')
      .delete()
      .eq('kind_id', window.mijlpalenKindId)
      .eq('template_id', templateId);
    if (error) { alert('Fout: ' + error.message); checkbox.checked = true; return; }
  }

  await laadMijlpalen(window.mijlpalenKindId);
}

// ─── Eigen mijlpaal modal ─────────────────────────────────────────────────────

function openEigenMijlpaalModal() {
  document.getElementById('modal-mijlpaal').classList.add('open');
  document.getElementById('mijl-eigen-naam').value = '';
  document.getElementById('mijl-eigen-datum').value = new Date().toISOString().split('T')[0];
  document.getElementById('mijl-eigen-icoon').value = '⭐';
}

function sluitEigenMijlpaalModal() {
  document.getElementById('modal-mijlpaal').classList.remove('open');
}

async function eigenMijlpaalOpslaan() {
  const naam  = document.getElementById('mijl-eigen-naam').value.trim();
  const datum = document.getElementById('mijl-eigen-datum').value;
  const icoon = document.getElementById('mijl-eigen-icoon').value.trim() || '⭐';

  if (!naam)  return alert('Vul een naam in.');
  if (!datum) return alert('Kies een datum.');

  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('mijlpalen').insert({
    kind_id: window.mijlpalenKindId,
    user_id: user.id,
    naam,
    datum,
    icoon,
    template_id: null,
  });
  if (error) return alert('Fout: ' + error.message);

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

function formatDatumKort(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
