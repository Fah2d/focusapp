import type { Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (e) => reject(e));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getRadianAngle(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const rotRad = getRadianAngle(rotation);
  const { width: bw, height: bh } = rotateSize(image.width, image.height, rotation);

  canvas.width = bw;
  canvas.height = bh;

  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const out = document.createElement("canvas");
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Could not get output canvas context");

  out.width = pixelCrop.width;
  out.height = pixelCrop.height;

  outCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas produced empty blob"));
      },
      "image/jpeg",
      0.92
    );
  });
}
