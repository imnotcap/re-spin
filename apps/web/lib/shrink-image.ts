/** Kan bruges i browseren. */
const MAX_EDGE = 2000;

/** Gør billedet mindre i browseren (telefonfotos er ofte 5–12 MB); serveren omkoder alligevel bagefter */
export async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}
