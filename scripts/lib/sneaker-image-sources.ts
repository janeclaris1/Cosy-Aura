const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/json",
};

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.split(/\s+\d+w,/)[0].trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function extractNikeImages(html: string): string[] {
  const patterns = [
    /https:\/\/static\.nike\.com\/a\/images\/t_web_pdp_936_v2\/f_auto[^"\\\s]+/g,
    /https:\/\/static\.nike\.com\/a\/images\/t_web_pw_592_v2\/f_auto[^"\\\s]+/g,
  ];
  const urls: string[] = [];
  for (const pattern of patterns) {
    urls.push(...(html.match(pattern) ?? []));
  }
  return uniqueUrls(urls);
}

function extractAdidasImages(html: string): string[] {
  const patterns = [
    /https:\/\/assets\.adidas\.com\/images\/w_600,f_auto,q_auto\/[^"\\]+_standard\.jpg/g,
    /https:\/\/assets\.adidas\.com\/images\/h_600,f_auto,q_auto\/[^"\\]+_standard\.jpg/g,
  ];
  const urls: string[] = [];
  for (const pattern of patterns) {
    urls.push(...(html.match(pattern) ?? []));
  }
  return uniqueUrls(urls);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) return "";
  return res.text();
}

export async function fetchNikeProductImages(styleCode: string): Promise<string[]> {
  const norm = styleCode.toLowerCase().replace(/-/g, "");
  const searchHtml = await fetchText(
    `https://www.nike.com/w?q=${encodeURIComponent(styleCode)}`
  );
  const links = [...searchHtml.matchAll(/href="(\/t\/[^"?#]+)"/g)].map((m) => m[1]);
  let productPath =
    links.find((link) => link.toLowerCase().replace(/-/g, "").includes(norm)) ??
    links[0];

  const directPaths = [
    `/t/shoes/${styleCode}`,
    `/t/dunk-low-shoes/${styleCode}`,
    `/t/air-max-95-shoes/${styleCode}`,
    `/t/air-force-1-07-mens-shoes-CW2288/${styleCode}`,
    `/t/zoom-fly-6-road-racing-shoes/${styleCode}`,
    `/t/nike-wildwood-acg-mens-shoes/${styleCode}`,
    `/t/sb-dunk-low-pro-skate-shoes/${styleCode}`,
    `/t/ja-3-valentines-day-basketball-shoes/${styleCode}`,
    `/t/nike-air-max-95-big-bubble-mens-shoes/${styleCode}`,
  ];

  const candidates = [
    ...(productPath ? [`https://www.nike.com${productPath}`] : []),
    ...directPaths.map((p) => `https://www.nike.com${p}`),
  ];

  for (const url of uniqueUrls(candidates)) {
    const html = await fetchText(url);
    const imgs = extractNikeImages(html);
    if (imgs.length) return imgs.slice(0, 6);
  }

  return extractNikeImages(searchHtml).slice(0, 6);
}

export async function fetchAdidasProductImages(styleCode: string): Promise<string[]> {
  const searchHtml = await fetchText(
    `https://www.adidas.com/us/search?q=${encodeURIComponent(styleCode)}`
  );
  const linkMatch = searchHtml.match(
    new RegExp(`href="(/us/[^"]+/${styleCode}\\.html)"`, "i")
  );
  const productUrl = linkMatch
    ? `https://www.adidas.com${linkMatch[1]}`
    : `https://www.adidas.com/us/samba-og-shoes-kids/${styleCode}.html`;

  for (const url of uniqueUrls([productUrl, `https://www.adidas.com/us/search?q=${styleCode}`])) {
    const html = await fetchText(url);
    const imgs = extractAdidasImages(html);
    if (imgs.length) return imgs.slice(0, 6);
  }

  return [];
}

export async function fetchReebokProductImages(styleCode: string): Promise<string[]> {
  for (let page = 1; page <= 4; page++) {
    const res = await fetch(
      `https://www.reebok.com/products.json?limit=250&page=${page}`,
      { headers: FETCH_HEADERS }
    );
    if (!res.ok) break;

    let data: {
      products?: Array<{
        title: string;
        handle: string;
        images: Array<{ src: string }>;
        variants: Array<{ sku: string | null }>;
      }>;
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      break;
    }

    const products = data.products ?? [];
    if (!products.length) break;

    const needle = styleCode.toLowerCase();
    const match = products.find((product) => {
      const skus = product.variants.map((v) => (v.sku ?? "").toLowerCase()).join(" ");
      return skus.includes(needle) || product.handle.toLowerCase().includes(needle);
    });

    if (match?.images?.length) {
      return match.images.map((img) => img.src.split("?")[0]).slice(0, 6);
    }
  }

  return [];
}

export async function resolveSneakerImages(input: {
  brand: string;
  styleCode: string;
  imageCandidates?: string[];
}): Promise<string[]> {
  if (input.imageCandidates?.length) {
    return uniqueUrls(input.imageCandidates);
  }

  const brand = input.brand.toLowerCase();
  if (brand.includes("nike")) {
    return fetchNikeProductImages(input.styleCode);
  }
  if (brand.includes("adidas") || brand.includes("yeezy")) {
    return fetchAdidasProductImages(input.styleCode);
  }
  if (brand.includes("reebok")) {
    return fetchReebokProductImages(input.styleCode);
  }

  return [];
}
