// Veritabani semasi. Her acilista IF NOT EXISTS ile calisir; tablo silmez, veri bozmaz.
// Yeni sutun gerekirse sona "alter table ... add column if not exists" eklenir.
// SEMAYI DEGISTIRINCE SEMA_SURUM'U ARTIR: soguk acilista sema yalnizca kayitli surum eskiyse calisir
// (ALTER TABLE, sutun varken bile tablo kilidi alir; her yeni sunucu orneginde calismasin).
export const SEMA_SURUM = "6";
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

-- V2 (2026-11-22, Derin geri bildirimi): takim logosu/rengi, kadrolar, asist, canli mac, 3.luk maci (asama 'ucuncu')
alter table takim add column if not exists logo text;
alter table takim add column if not exists renk text;
create table if not exists oyuncu (
  id serial primary key,
  takim_id int not null references takim(id) on delete cascade,
  ad text not null,
  numara int
);
create index if not exists oyuncu_takim on oyuncu (takim_id);
alter table gol add column if not exists oyuncu_id int references oyuncu(id) on delete set null;
alter table gol add column if not exists asist text not null default '';
alter table gol add column if not exists asist_id int references oyuncu(id) on delete set null;
alter table mac add column if not exists canli boolean not null default false;
-- V3 (2026-11-22, Derin): mac hakemi
alter table mac add column if not exists hakem text not null default '';
-- V4 (2026-11-23, Derin): oyuncu yasi + yalniz yonetimin gordugu bolum/ogrenci no; sari/kirmizi kartlar
alter table oyuncu add column if not exists yas int;
alter table oyuncu add column if not exists bolum text not null default '';
alter table oyuncu add column if not exists ogrenci_no text not null default '';
-- renk: sari | kirmizi
create table if not exists kart (
  id serial primary key,
  mac_id int not null references mac(id) on delete cascade,
  takim_id int not null references takim(id) on delete cascade,
  oyuncu text not null,
  oyuncu_id int references oyuncu(id) on delete set null,
  renk text not null,
  dakika int
);
create index if not exists kart_mac on kart (mac_id);
-- V5 (2026-11-24, Derin): oyuncu sinifi, mevkii ve profil fotografi (data URL); bolum artik herkese acik, ogrenci_no gizli kalir
alter table oyuncu add column if not exists sinif text not null default '';
alter table oyuncu add column if not exists mevki text not null default '';
alter table oyuncu add column if not exists foto text;
-- Kura animasyonu: son cekilen kuranin sirasi, JSON [{"takim_id":1,"torba":1,"grup":"A"}, ...] + cekim zamani
alter table turnuva add column if not exists kura text;
alter table turnuva add column if not exists kura_zaman timestamptz;
-- Herkese acik formlarin hiz siniri: sabit pencereli atomik sayac (anahtar = islem:ip, pencere = pencere baslangici)
create table if not exists istek_sayac (
  anahtar text not null,
  pencere timestamptz not null,
  n int not null default 0,
  primary key (anahtar, pencere)
);
-- Koy randevusunu alan IP (ayni IP'den en cok 2 aktif gelecek randevu; sahte doldurmaya karsi)
alter table koy_randevu add column if not exists ip text not null default '';
-- V6 (2026-11-27, Derin): forma opsiyonlari. yazi = arkaya isim/numara (ucretli opsiyon), logo3d = 3D logo;
-- tutar = siparis anindaki toplam fiyat (ayarlardaki fiyat sonradan degisse de siparis kendi tutarini korur; eski kayitta null)
alter table forma_siparis add column if not exists yazi boolean not null default false;
alter table forma_siparis add column if not exists logo3d boolean not null default false;
alter table forma_siparis add column if not exists tutar int;
`;
