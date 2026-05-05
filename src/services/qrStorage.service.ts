import { supabase } from '../lib/supabase';
import { getQRModConfig } from '../utils/qrModConfig';

const BUCKET = 'qrs';

type Resolution = 'baja' | 'media' | 'alta' | 'ultra';

interface QrLabels {
  [key: string]: string;
}

function getStoragePath(codificacion: string, resolution: Resolution): string {
  const safeCod = codificacion.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  return `labels/${safeCod}/${resolution}.png`;
}

function getQrRawPath(codificacion: string): string {
  const safeCod = codificacion.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  return `raw/${safeCod}.png`;
}

function computeConfigHash(): string {
  const config = getQRModConfig();
  const relevant = JSON.stringify({
    lw: config.labelWidth,
    lh: config.labelHeight,
    lbr: config.labelBorderRadius,
    lbw: config.labelBorderWidth,
    qs: config.qrSize,
    qt: config.qrTop,
    ql: config.qrLeft,
    qch: config.qrCenterHorizontally,
    ab: config.arBottom,
    as: config.arSize,
    ag: config.arGap,
    aox: config.arOffsetX,
    aoy: config.arOffsetY,
    fs: config.fontSize,
    ff: config.fontFamily,
    ui: config.useImage,
    ip: config.imagePath,
    ch: config.checkHeight,
    cw: config.checkWidth,
    csw: config.checkStrokeWidth,
    csv: config.checkSpacingVertical,
    tox: config.tildeOffsetX,
    toy: config.tildeOffsetY,
    sc: config.symbolCount,
    s1a: config.symbol1Angle,
    s2a: config.symbol2Angle,
    ss: config.symbolSize,
    fw: config.fontWeight,
    ls: config.letterSpacing,
    tt: config.textTransform,
    at: config.arText,
    uc: config.useCMYK,
    cmyk: config.cmyk,
    cc: config.checkColor,
  });
  let hash = 0;
  for (let i = 0; i < relevant.length; i++) {
    const ch = relevant.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return hash.toString(36);
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function isBase64(value: string): boolean {
  return value.startsWith('data:');
}

function isStoragePath(value: string): boolean {
  return value.startsWith('raw/') || value.startsWith('labels/');
}

async function uploadRawQr(codificacion: string, blob: Blob): Promise<string> {
  const path = getQrRawPath(codificacion);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw new Error(`Error uploading raw QR: ${error.message}`);
  return path;
}

async function uploadLabel(
  codificacion: string,
  resolution: Resolution,
  blob: Blob
): Promise<string> {
  const path = getStoragePath(codificacion, resolution);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw new Error(`Error uploading label: ${error.message}`);
  return path;
}

async function getExistingLabel(
  codificacion: string,
  resolution: Resolution,
  currentConfigHash: string,
  storedLabels?: QrLabels | null,
  storedConfigHash?: string | null
): Promise<string | null> {
  if (storedConfigHash !== currentConfigHash) return null;
  if (!storedLabels || !storedLabels[resolution]) return null;

  const path = storedLabels[resolution];
  return getPublicUrl(path);
}

async function saveLabelReference(
  codificacion: string,
  resolution: Resolution,
  storagePath: string,
  configHash: string
): Promise<void> {
  const { data: product } = await supabase
    .from('products')
    .select('qr_labels')
    .eq('codificacion', codificacion)
    .maybeSingle();

  const existingLabels = (product?.qr_labels as QrLabels) || {};
  const updatedLabels = { ...existingLabels, [resolution]: storagePath };

  await supabase
    .from('products')
    .update({
      qr_labels: updatedLabels,
      qr_config_hash: configHash,
    })
    .eq('codificacion', codificacion);
}

async function invalidateLabels(codificacion: string): Promise<void> {
  const { data: product } = await supabase
    .from('products')
    .select('qr_labels')
    .eq('codificacion', codificacion)
    .maybeSingle();

  const labels = (product?.qr_labels as QrLabels) || {};
  const paths = Object.values(labels).filter(Boolean);

  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  await supabase
    .from('products')
    .update({ qr_labels: {}, qr_config_hash: null })
    .eq('codificacion', codificacion);
}

async function deleteAllForProduct(codificacion: string): Promise<void> {
  const safeCod = codificacion.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(`labels/${safeCod}`);

  if (files && files.length > 0) {
    const paths = files.map(f => `labels/${safeCod}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }

  const rawPath = getQrRawPath(codificacion);
  await supabase.storage.from(BUCKET).remove([rawPath]);
}

function resolveQrPath(qrPath: string | null): string | null {
  if (!qrPath) return null;
  if (isBase64(qrPath)) return qrPath;
  if (isStoragePath(qrPath)) return getPublicUrl(qrPath);
  return qrPath;
}

export const qrStorageService = {
  uploadRawQr,
  uploadLabel,
  getExistingLabel,
  saveLabelReference,
  invalidateLabels,
  deleteAllForProduct,
  computeConfigHash,
  getPublicUrl,
  resolveQrPath,
  isBase64,
  isStoragePath,
  getStoragePath,
  getQrRawPath,
};
