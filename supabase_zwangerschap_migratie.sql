-- ═══════════════════════════════════════════════════════════
-- Groeiboek — Zwangerschap tabellen
-- Plak dit in de Supabase SQL Editor en klik op Run
-- ═══════════════════════════════════════════════════════════

-- 1. Metadata per kind (uitgerekende datum, datum ontdekt)
CREATE TABLE IF NOT EXISTS zwangerschap_info (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_id          UUID NOT NULL REFERENCES kinderen(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  uitgerekende_datum DATE,
  ontdekt_datum    DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kind_id)
);
ALTER TABLE zwangerschap_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigen zwangerschap_info" ON zwangerschap_info
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Herinneringen per trimester (dagboek)
CREATE TABLE IF NOT EXISTS zwangerschap_herinneringen (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_id   UUID NOT NULL REFERENCES kinderen(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL,
  trimester SMALLINT NOT NULL CHECK (trimester IN (1, 2, 3)),
  inhoud    TEXT NOT NULL,
  datum     DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE zwangerschap_herinneringen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigen zwangerschap_herinneringen" ON zwangerschap_herinneringen
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Foto's (echo, buikfoto, aankondiging, overig)
CREATE TABLE IF NOT EXISTS zwangerschap_fotos (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_id UUID NOT NULL REFERENCES kinderen(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  url     TEXT NOT NULL,
  pad     TEXT NOT NULL,
  label   VARCHAR(200),
  soort   VARCHAR(50) DEFAULT 'overig', -- 'echo' | 'buik' | 'aankondiging' | 'overig'
  datum   DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE zwangerschap_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigen zwangerschap_fotos" ON zwangerschap_fotos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Mijlpalen (aanvinken met datum)
CREATE TABLE IF NOT EXISTS zwangerschap_mijlpalen (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_id UUID NOT NULL REFERENCES kinderen(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sleutel VARCHAR(100) NOT NULL,   -- vaste sleutel, bijv. 'positieve_test'
  naam    VARCHAR(200) NOT NULL,
  datum   DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kind_id, sleutel)
);
ALTER TABLE zwangerschap_mijlpalen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigen zwangerschap_mijlpalen" ON zwangerschap_mijlpalen
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
