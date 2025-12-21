-- Supabase SQL Schema for 備蓄品管理アプリ
-- Supabase Dashboard > SQL Editor でこのスクリプトを実行してください

-- 家族（グループ）テーブル
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーテーブル（auth.usersを拡張）
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  display_name TEXT,
  line_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 袋テーブル
CREATE TABLE bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 備蓄品テーブル
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INT DEFAULT 1,
  expiry_date DATE NOT NULL,
  bag_id UUID REFERENCES bags(id) ON DELETE SET NULL,
  location_note TEXT,
  notified_30 BOOLEAN DEFAULT FALSE,
  notified_7 BOOLEAN DEFAULT FALSE,
  notified_1 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) を有効化
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分の情報を読み書きできる
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ポリシー: ユーザーは所属する家族の情報を読み書きできる
CREATE POLICY "Users can view own family" ON families
  FOR SELECT USING (
    id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create family" ON families
  FOR INSERT WITH CHECK (true);

-- ポリシー: 同じ家族のメンバーは備蓄品を読み書きできる
CREATE POLICY "Family members can view items" ON items
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Family members can insert items" ON items
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Family members can update items" ON items
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Family members can delete items" ON items
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- ポリシー: 同じ家族のメンバーは袋を読み書きできる
CREATE POLICY "Family members can view bags" ON bags
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Family members can insert bags" ON bags
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- 招待コードで家族を検索するためのポリシー
CREATE POLICY "Anyone can find family by invite code" ON families
  FOR SELECT USING (true);
