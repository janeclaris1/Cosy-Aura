import QRCode from "qrcode";

type PosReceiptQrProps = {
  value: string;
  /** Accessible label; receipt number is already printed above the QR area. */
  label?: string;
};

export async function PosReceiptQr({ value, label }: PosReceiptQrProps) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 4,
    width: 256,
    errorCorrectionLevel: "H",
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  return (
    <div
      className="pos-receipt-qr inline-flex w-[120px] h-[120px] bg-white p-1 print:p-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:[shape-rendering:crispEdges]"
      role="img"
      aria-label={label || "Receipt QR code"}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
