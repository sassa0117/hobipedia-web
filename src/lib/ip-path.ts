const BASE_URL = "https://hobipedia.jp";

/**
 * Encode an IP name as exactly one path segment.
 *
 * Next.js decodes route parameters once before handing them to a page. A
 * literal slash therefore needs its percent sign escaped as well, otherwise
 * names such as "Fate/strange Fake" are split into two route segments.
 */
export function encodeIpPathSegment(ipName: string): string {
  return encodeURIComponent(ipName).replace(/%2F/gi, "%252F");
}

export function decodeIpPathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function buildIpPath(ipName: string): string {
  return `/ip/${encodeIpPathSegment(ipName)}`;
}

export function buildIpCanonicalUrl(ipName: string): string {
  return `${BASE_URL}${buildIpPath(ipName)}`;
}
