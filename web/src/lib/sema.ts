// Veritabani semasi. Her acilista IF NOT EXISTS ile calisir; tablo silmez, veri bozmaz.
// Yeni sutun gerekirse sona "alter table ... add column if not exists" eklenir.
export const SEMA = /* sql */ `
create table if not exists ayar (
  anahtar text primary key,
  deger text not null
);

create table if not exists etkinlik (
  id serial primary key,
  tarih date not null,
  saat text not null default '',
  ad text not null,
  tur text not null default '',
  yer text not null default '',
  ornek boolean not null default false
);

-- TURNUVA
-- durum: basvuru | grup | eleme | bitti
create table if not exists turnuva (
  id serial primary key,
  ad text not null,
  sezon text not null default '',
  durum text not null default 'basvuru',
  aciklama text not null default '',
  kurallar text not null default '',
  kontenjan int not null default 32,
  basvuru_acik boolean not null default true,
  aktif boolean not null default false,
  ornek boolean not null default false,
  olusturma timestamptz not null default now()
);
create table if not exists takim (
  id serial primary key,
  turnuva_id int not null references turnuva(id) on delete cascade,
  ad text not null,
  grup text,
  torba int,
  unique (turnuva_id, ad)
);
-- asama: grup | son16 | ceyrek | yari | final
create table if not exists mac (
  id serial primary key,
  turnuva_id int not null references turnuva(id) on delete cascade,
  asama text not null,
  grup text,
  sira int not null default 0,
  ev_id int references takim(id) on delete set null,
  dep_id int references takim(id) on delete set null,
  zaman timestamptz,
  saha text not null default '',
  ev_gol int,
  dep_gol int,
  ev_pen int,
  dep_pen int
);
create table if not exists gol (
  id serial primary key,
  mac_id int not null references mac(id) on delete cascade,
  takim_id int not null references takim(id) on delete cascade,
  oyuncu text not null,
  dakika int
);
-- durum: bekliyor | onaylandi | reddedildi
create table if not exists basvuru (
  id serial primary key,
  turnuva_id int not null references turnuva(id) on delete cascade,
  takim_ad text not null,
  kaptan text not null,
  telefon text not null,
  eposta text not null,
  oyuncular text not null default '',
  durum text not null default 'bekliyor',
  olusturma timestamptz not null default now()
);

-- FORMA ON SIPARISI
-- parti: hedef kisiye ulasinca toplu siparis verilir. durum: acik | doldu | siparis | teslim
create table if not exists forma_parti (
  id serial primary key,
  hedef int not null default 5,
  durum text not null default 'acik',
  olusturma timestamptz not null default now()
);
-- durum: kapora_bekliyor | kapora_alindi | odendi | iptal
create table if not exists forma_siparis (
  id serial primary key,
  parti_id int not null references forma_parti(id) on delete cascade,
  ad text not null,
  telefon text not null,
  beden text not null,
  arka_isim text not null default '',
  numara int,
  kod text not null unique,
  durum text not null default 'kapora_bekliyor',
  ornek boolean not null default false,
  olusturma timestamptz not null default now()
);

-- KOY SAHASI (slot 0..9 = 17:00..03:00, bkz. src/lib/koy-sahasi.ts)
create table if not exists koy_randevu (
  id serial primary key,
  tarih date not null,
  slot int not null,
  ad text not null,
  telefon text not null,
  hafta date not null,
  notu text not null default '',
  kod text not null unique,
  durum text not null default 'aktif',
  olusturma timestamptz not null default now()
);
create unique index if not exists koy_randevu_slot on koy_randevu (tarih, slot) where durum = 'aktif';
create unique index if not exists koy_randevu_hafta on koy_randevu (telefon, hafta) where durum = 'aktif';
create table if not exists koy_kapali (
  tarih date not null,
  slot int not null,
  sebep text not null default '',
  primary key (tarih, slot)
);

-- OKUL SAHASI dolulugu (yonetim elle girer; okulun sistemi veri vermiyor). bas/bit saat (8..24)
create table if not exists okul_dolu (
  id serial primary key,
  tarih date not null,
  bas int not null,
  bit int not null,
  etiket text not null default ''
);

-- Yonetim girisi hiz siniri
create table if not exists giris_deneme (
  ip text not null,
  zaman timestamptz not null default now()
);
create index if not exists giris_deneme_ip on giris_deneme (ip, zaman);
`;
