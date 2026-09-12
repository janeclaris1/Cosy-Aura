/** Convert a monetary amount to words (Ghana Cedis & pesewas). */
export function amountInWords(
  amount: number,
  currencyName = "Ghana Cedis",
  subunitName = "Pesewas"
): string {
  const value = Math.round(Number(amount || 0) * 100) / 100;
  const whole = Math.floor(value);
  const cents = Math.round((value - whole) * 100);

  const wholeWords = integerToWords(whole);
  const parts: string[] = [];

  if (wholeWords) {
    parts.push(`${wholeWords} ${currencyName}${whole === 1 ? "" : ""}`);
  }
  if (cents > 0) {
    parts.push(`${integerToWords(cents)} ${subunitName}${cents === 1 ? "" : ""}`);
  }
  if (!parts.length) return `Zero ${currencyName} only`;

  return `${parts.join(" and ")} only`;
}

function integerToWords(n: number): string {
  if (n === 0) return "";
  if (n < 0) return `Minus ${integerToWords(-n)}`;

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function underThousand(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const r = num % 10;
      return r ? `${tens[t]}-${ones[r]}` : tens[t];
    }
    const h = Math.floor(num / 100);
    const r = num % 100;
    return r ? `${ones[h]} Hundred ${underThousand(r)}` : `${ones[h]} Hundred`;
  }

  const scales = [
    { value: 1_000_000_000, label: "Billion" },
    { value: 1_000_000, label: "Million" },
    { value: 1_000, label: "Thousand" },
  ];

  let remaining = n;
  const chunks: string[] = [];

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining %= scale.value;
      chunks.push(`${underThousand(count)} ${scale.label}`);
    }
  }
  if (remaining > 0) chunks.push(underThousand(remaining));

  return chunks.join(" ").replace(/\s+/g, " ").trim();
}
