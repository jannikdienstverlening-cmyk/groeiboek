-- ══════════════════════════════════════════════════════════════
--  GROEIBOEK — Volledig databaseschema
--  Voegt kolommen toe aan bestaande tabellen + maakt nieuwe aan
-- ══════════════════════════════════════════════════════════════

-- ── 1. kinderen ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinderen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE kinderen ADD COLUMN IF NOT EXISTS user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE kinderen ADD COLUMN IF NOT EXISTS naam          text;
ALTER TABLE kinderen ADD COLUMN IF NOT EXISTS geboortedatum date;
ALTER TABLE kinderen ADD COLUMN IF NOT EXISTS geslacht      text;
ALTER TABLE kinderen ADD COLUMN IF NOT EXISTS created_at    timestamptz DEFAULT now();
ALTER TABLE kinderen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kinderen_eigen ON kinderen;
CREATE POLICY kinderen_eigen ON kinderen
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 2. dagboek ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dagboek (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE dagboek ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE dagboek ADD COLUMN IF NOT EXISTS kind_id    uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE dagboek ADD COLUMN IF NOT EXISTS inhoud     text;
ALTER TABLE dagboek ADD COLUMN IF NOT EXISTS datum      date;
ALTER TABLE dagboek ADD COLUMN IF NOT EXISTS periode    text;
ALTER TABLE dagboek ADD COLUMN IF NOT EXISTS sfeer      text;
ALTER TABLE dagboek ADD COLUMN IF NOT EXISTS leeftijd   text;
ALTER TABLE dagboek ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE dagboek ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dagboek_eigen ON dagboek;
CREATE POLICY dagboek_eigen ON dagboek
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3. metingen ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metingen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE metingen ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE metingen ADD COLUMN IF NOT EXISTS kind_id    uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE metingen ADD COLUMN IF NOT EXISTS datum      date;
ALTER TABLE metingen ADD COLUMN IF NOT EXISTS lengte     numeric;
ALTER TABLE metingen ADD COLUMN IF NOT EXISTS gewicht    numeric;
ALTER TABLE metingen ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE metingen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metingen_eigen ON metingen;
CREATE POLICY metingen_eigen ON metingen
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 4. mijlpalen_templates (bestaand schema: id, type, label, emoji, categorie, volg) ──
-- Tabel bestaat al met correcte data — geen wijzigingen nodig.

-- ── 5. mijlpalen ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mijlpalen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE mijlpalen ADD COLUMN IF NOT EXISTS user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE mijlpalen ADD COLUMN IF NOT EXISTS kind_id     uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE mijlpalen ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES mijlpalen_templates(id);
ALTER TABLE mijlpalen ADD COLUMN IF NOT EXISTS naam        text;
ALTER TABLE mijlpalen ADD COLUMN IF NOT EXISTS datum       date;
ALTER TABLE mijlpalen ADD COLUMN IF NOT EXISTS icoon       text;
ALTER TABLE mijlpalen ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();
ALTER TABLE mijlpalen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mijlpalen_eigen ON mijlpalen;
CREATE POLICY mijlpalen_eigen ON mijlpalen
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 6. woordjes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS woordjes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE woordjes ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE woordjes ADD COLUMN IF NOT EXISTS kind_id    uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE woordjes ADD COLUMN IF NOT EXISTS woord      text;
ALTER TABLE woordjes ADD COLUMN IF NOT EXISTS datum      date;
ALTER TABLE woordjes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE woordjes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS woordjes_eigen ON woordjes;
CREATE POLICY woordjes_eigen ON woordjes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 7. fotos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE fotos ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE fotos ADD COLUMN IF NOT EXISTS kind_id    uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE fotos ADD COLUMN IF NOT EXISTS url        text;
ALTER TABLE fotos ADD COLUMN IF NOT EXISTS pad        text;
ALTER TABLE fotos ADD COLUMN IF NOT EXISTS label      text;
ALTER TABLE fotos ADD COLUMN IF NOT EXISTS datum      date;
ALTER TABLE fotos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fotos_eigen ON fotos;
CREATE POLICY fotos_eigen ON fotos
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 8. abonnementen ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abonnementen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS actief     boolean DEFAULT false;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS geldig_tot timestamptz;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE abonnementen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS abonnementen_eigen ON abonnementen;
CREATE POLICY abonnementen_eigen ON abonnementen
  USING (auth.uid() = user_id);

-- ── 9. zwangerschap_info ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS zwangerschap_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE zwangerschap_info ADD COLUMN IF NOT EXISTS user_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE zwangerschap_info ADD COLUMN IF NOT EXISTS kind_id            uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE zwangerschap_info ADD COLUMN IF NOT EXISTS uitgerekende_datum date;
ALTER TABLE zwangerschap_info ADD COLUMN IF NOT EXISTS ontdekt_datum      date;
ALTER TABLE zwangerschap_info ADD COLUMN IF NOT EXISTS created_at         timestamptz DEFAULT now();
ALTER TABLE zwangerschap_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS zw_info_eigen ON zwangerschap_info;
CREATE POLICY zw_info_eigen ON zwangerschap_info
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 10. zwangerschap_herinneringen ────────────────────────────
CREATE TABLE IF NOT EXISTS zwangerschap_herinneringen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE zwangerschap_herinneringen ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE zwangerschap_herinneringen ADD COLUMN IF NOT EXISTS kind_id    uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE zwangerschap_herinneringen ADD COLUMN IF NOT EXISTS trimester  int;
ALTER TABLE zwangerschap_herinneringen ADD COLUMN IF NOT EXISTS inhoud     text;
ALTER TABLE zwangerschap_herinneringen ADD COLUMN IF NOT EXISTS datum      date;
ALTER TABLE zwangerschap_herinneringen ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE zwangerschap_herinneringen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS zw_herinn_eigen ON zwangerschap_herinneringen;
CREATE POLICY zw_herinn_eigen ON zwangerschap_herinneringen
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 11. zwangerschap_fotos ────────────────────────────────────
CREATE TABLE IF NOT EXISTS zwangerschap_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE zwangerschap_fotos ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE zwangerschap_fotos ADD COLUMN IF NOT EXISTS kind_id    uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE zwangerschap_fotos ADD COLUMN IF NOT EXISTS url        text;
ALTER TABLE zwangerschap_fotos ADD COLUMN IF NOT EXISTS pad        text;
ALTER TABLE zwangerschap_fotos ADD COLUMN IF NOT EXISTS label      text;
ALTER TABLE zwangerschap_fotos ADD COLUMN IF NOT EXISTS soort      text;
ALTER TABLE zwangerschap_fotos ADD COLUMN IF NOT EXISTS datum      date;
ALTER TABLE zwangerschap_fotos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE zwangerschap_fotos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS zw_fotos_eigen ON zwangerschap_fotos;
CREATE POLICY zw_fotos_eigen ON zwangerschap_fotos
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 12. zwangerschap_mijlpalen ────────────────────────────────
CREATE TABLE IF NOT EXISTS zwangerschap_mijlpalen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE zwangerschap_mijlpalen ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE zwangerschap_mijlpalen ADD COLUMN IF NOT EXISTS kind_id    uuid REFERENCES kinderen(id) ON DELETE CASCADE;
ALTER TABLE zwangerschap_mijlpalen ADD COLUMN IF NOT EXISTS sleutel    text;
ALTER TABLE zwangerschap_mijlpalen ADD COLUMN IF NOT EXISTS datum      date;
ALTER TABLE zwangerschap_mijlpalen ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE zwangerschap_mijlpalen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS zw_mijl_eigen ON zwangerschap_mijlpalen;
CREATE POLICY zw_mijl_eigen ON zwangerschap_mijlpalen
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
