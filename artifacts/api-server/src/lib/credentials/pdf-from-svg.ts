import { PDFDocument } from "pdf-lib";
import { Resvg } from "@resvg/resvg-js";

const CR80_W = 242.77;
const CR80_H = 153.07;
const A4_W = 595.28;
const A4_H = 841.89;

export async function svgToPngBytes(svg: string, width: number): Promise<Uint8Array> {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "white",
  });
  return resvg.render().asPng();
}

export async function idCardPairToPdf(frontSvg: string, backSvg: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const frontPng = await svgToPngBytes(frontSvg, 856);
  const backPng = await svgToPngBytes(backSvg, 856);
  const frontImg = await pdf.embedPng(frontPng);
  const backImg = await pdf.embedPng(backPng);

  const frontPage = pdf.addPage([CR80_W, CR80_H]);
  frontPage.drawImage(frontImg, { x: 0, y: 0, width: CR80_W, height: CR80_H });

  const backPage = pdf.addPage([CR80_W, CR80_H]);
  backPage.drawImage(backImg, { x: 0, y: 0, width: CR80_W, height: CR80_H });

  return pdf.save();
}

export async function certificateSvgToPdf(svg: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const png = await svgToPngBytes(svg, 1240);
  const img = await pdf.embedPng(png);
  const page = pdf.addPage([A4_W, A4_H]);
  const scale = Math.min(A4_W / img.width, A4_H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  page.drawImage(img, { x: (A4_W - w) / 2, y: (A4_H - h) / 2, width: w, height: h });
  return pdf.save();
}
