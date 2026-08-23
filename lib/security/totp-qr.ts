import QRCode from "qrcode";

export async function createTotpQrCodeDataUrl(provisioningUri: string) {
  const uri = new URL(provisioningUri);
  if (uri.protocol !== "otpauth:" || uri.hostname !== "totp") {
    throw new Error("Only TOTP provisioning URIs can be rendered as enrollment QR codes.");
  }

  return QRCode.toDataURL(provisioningUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
    color: {
      dark: "#111111ff",
      light: "#ffffffff",
    },
  });
}
