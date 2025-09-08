/*
  # Liste tablosuna asistan_mesaji sütunu ekleme

  1. Değişiklikler
    - `liste` tablosuna `asistan_mesaji` sütunu ekleniyor
    - Bu sütun asistanın kişilere ileteceği mesajı saklayacak
    - TEXT tipinde ve opsiyonel (NULL olabilir)

  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
    - Yeni sütun için ek güvenlik gereksinimi yok
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'liste' AND column_name = 'asistan_mesaji'
  ) THEN
    ALTER TABLE liste ADD COLUMN asistan_mesaji TEXT;
  END IF;
END $$;