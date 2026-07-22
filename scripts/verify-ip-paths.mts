import assert from "node:assert/strict";
import { buildIpCanonicalUrl, buildIpPath, decodeIpPathSegment } from "../src/lib/ip-path.ts";
assert.equal(buildIpPath("鬼滅の刃"), "/ip/%E9%AC%BC%E6%BB%85%E3%81%AE%E5%88%83");
assert.equal(buildIpPath("Fate/strange Fake"), "/ip/Fate%252Fstrange%20Fake");
assert.equal(buildIpPath("$"), "/ip/%24");
assert.equal(buildIpCanonicalUrl("Fate/strange Fake"), "https://hobipedia.jp/ip/Fate%252Fstrange%20Fake");
assert.equal(decodeIpPathSegment("Fate%2Fstrange Fake"), "Fate/strange Fake");
console.log("IP path verification passed (5 cases)");