import QRCode from "qrcode";

export async function generateQrSvg(data: string, size = 120): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    margin: 1,
    width: size,
    color: { dark: "#1A1A2E", light: "#FFFFFF" },
  });
}
