/**
 * abonnement.js — Premium-status controleren en Stripe Checkout starten
 * Verwacht: sb (Supabase client) in globale scope
 */

let premiumStatus = null; // gecached resultaat

// ─── Status controleren ───────────────────────────────────────────────────────

async function isPremium() {
  if (premiumStatus !== null) return premiumStatus;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return (premiumStatus = false);

  const { data, error } = await sb
    .from('abonnementen')
    .select('actief, geldig_tot')
    .eq('user_id', user.id)
    .eq('actief', true)
    .maybeSingle();

  if (error || !data) return (premiumStatus = false);

  // Controleer geldigheid
  const geldig = new Date(data.geldig_tot) > new Date();
  premiumStatus = geldig;
  return geldig;
}

// ─── Badge in sidebar ─────────────────────────────────────────────────────────

async function laadPremiumBadge() {
  const premium = await isPremium();
  const badge   = document.getElementById('premium-badge');
  const upgrade = document.getElementById('sidebar-upgrade');
  const nav     = document.getElementById('hoofd-nav');

  if (premium) {
    if (badge)   badge.style.display   = 'inline-flex';
    if (upgrade) upgrade.style.display = 'none';
    if (nav)     nav.classList.remove('nav-gratis');
  } else {
    if (badge)   badge.style.display   = 'none';
    if (upgrade) upgrade.style.display = 'block';
    if (nav)     nav.classList.add('nav-gratis');
  }

  // Toon banner als betaald=true in URL (eenmalig via localStorage)
  if (new URLSearchParams(window.location.search).get('betaald') === 'true') {
    premiumStatus = null;
    const al = localStorage.getItem('groeiboek_betaald_gezien');
    if (!al) {
      toonBetaaldBanner();
      localStorage.setItem('groeiboek_betaald_gezien', '1');
    }
    window.history.replaceState({}, '', 'dashboard.html');
  }
}

function toonBetaaldBanner() {
  const banner = document.getElementById('betaald-banner');
  if (banner) {
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 6000);
  }
}

// ─── Upgrade modal ────────────────────────────────────────────────────────────

function showUpgradeModal() {
  document.getElementById('modal-upgrade').classList.add('open');
}

function sluitUpgradeModal() {
  document.getElementById('modal-upgrade').classList.remove('open');
}

async function startCheckout(plan) {
  const btn = document.getElementById(`btn-checkout-${plan}`);
  if (btn) { btn.disabled = true; btn.textContent = 'Even geduld...'; }

  const { data: { user } } = await sb.auth.getUser();

  try {
    const res = await fetch('/api/checkout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ plan, userId: user?.id, email: user?.email }),
    });

    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    } else {
      alert('Kon betaalpagina niet openen: ' + (json.error || 'onbekende fout'));
      if (btn) { btn.disabled = false; btn.textContent = plan === 'monthly' ? 'Kies maandelijks' : 'Kies jaarlijks'; }
    }
  } catch (err) {
    alert('Verbindingsfout: ' + err.message);
    if (btn) { btn.disabled = false; }
  }
}
