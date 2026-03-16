/**
 * groeicurve.js — Groeimetingen opslaan, ophalen en renderen
 * Verwacht: sb (Supabase client), groeicurveKindId (window), Chart.js geladen
 */

let groeicurveChart = null;

// ─── Opslaan ─────────────────────────────────────────────────────────────────

async function meetingOpslaan() {
  const datum   = document.getElementById('groei-datum').value;
  const lengte  = parseFloat(document.getElementById('groei-lengte').value);
  const gewicht = parseFloat(document.getElementById('groei-gewicht').value);

  if (!datum) return groeiFeedback('Kies een datum.', 'fout');
  if (isNaN(lengte) && isNaN(gewicht)) return groeiFeedback('Vul lengte en/of gewicht in.', 'fout');

  const { data: { user } } = await sb.auth.getUser();
  const payload = {
    kind_id: window.groeicurveKindId,
    user_id: user.id,
    datum,
    lengte:  isNaN(lengte)  ? null : lengte,
    gewicht: isNaN(gewicht) ? null : gewicht,
  };

  const { error } = await sb.from('metingen').insert(payload);
  if (error) return groeiFeedback('Fout: ' + error.message, 'fout');

  document.getElementById('groei-datum').value   = '';
  document.getElementById('groei-lengte').value  = '';
  document.getElementById('groei-gewicht').value = '';
  groeiFeedback('✅ Meting opgeslagen!', 'ok');
  await laadGroeicurve(window.groeicurveKindId);
}

// ─── Laden & renderen ─────────────────────────────────────────────────────────

async function laadGroeicurve(kindId) {
  window.groeicurveKindId = kindId;

  const { data: metingen, error } = await sb
    .from('metingen')
    .select('*')
    .eq('kind_id', kindId)
    .order('datum', { ascending: true });

  if (error) { console.error('metingen laden mislukt:', error.message); return; }

  renderGroeiTabel(metingen || []);
  renderGroeiChart(metingen || []);
}

function renderGroeiTabel(metingen) {
  const tbody = document.getElementById('groei-tabel-body');
  if (!tbody) return;
  if (metingen.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:1rem">Nog geen metingen</td></tr>';
    return;
  }
  // Nieuwste bovenaan in de tabel
  const gesorteerd = [...metingen].sort((a, b) => b.datum.localeCompare(a.datum));
  tbody.innerHTML = gesorteerd.map(m => `
    <tr>
      <td>${formatDatumKort(m.datum)}</td>
      <td>${m.lengte  != null ? m.lengte  + ' cm' : '—'}</td>
      <td>${m.gewicht != null ? m.gewicht + ' kg' : '—'}</td>
    </tr>
  `).join('');
}

function renderGroeiChart(metingen) {
  const ctx = document.getElementById('groei-chart');
  if (!ctx) return;

  const labels   = metingen.map(m => formatDatumKort(m.datum));
  const lengtes  = metingen.map(m => m.lengte);
  const gewichten = metingen.map(m => m.gewicht);

  if (groeicurveChart) groeicurveChart.destroy();

  groeicurveChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Lengte (cm)',
          data: lengtes,
          borderColor: '#1e6e55',
          backgroundColor: 'rgba(30,110,85,0.08)',
          tension: 0.3,
          yAxisID: 'y',
          spanGaps: true,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: 'Gewicht (kg)',
          data: gewichten,
          borderColor: '#f4a83a',
          backgroundColor: 'rgba(244,168,58,0.08)',
          tension: 0.3,
          yAxisID: 'y2',
          spanGaps: true,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 12 } } },
        tooltip: { callbacks: {
          label: ctx => ctx.dataset.label + ': ' + (ctx.parsed.y ?? '—'),
        }},
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Lengte (cm)', color: '#1e6e55' },
          ticks: { color: '#1e6e55' },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        y2: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Gewicht (kg)', color: '#f4a83a' },
          ticks: { color: '#f4a83a' },
          grid: { drawOnChartArea: false },
        },
        x: { grid: { color: 'rgba(0,0,0,0.05)' } },
      },
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groeiFeedback(tekst, type) {
  const el = document.getElementById('groei-melding');
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
