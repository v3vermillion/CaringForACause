#!/usr/bin/env bash
# Checks the deployed site's status codes, security headers, caching, and compression.
# Usage: scripts/check-live-headers.sh https://example.workers.dev
set -uo pipefail
base="${1%/}"
fail=0
pass() { echo "- ✅ $1"; }
bad() { echo "- ❌ $1"; fail=1; }

status() { curl -s -o /dev/null -w "%{http_code}" "$base$1"; }
# Download once and check the saved text. Piping curl straight into `grep -q`
# can cut the download short and, with pipefail, report a false failure.
html=$(curl -s "$base/")
robots=$(curl -s "$base/robots.txt")
header() { curl -sI --compressed "$base$1" | tr -d '\r' | grep -i "^$2:" | head -1 | cut -d' ' -f2-; }

echo "#### Deployed version"
live_version=$(grep -oE '<meta name="version" content="[^"]+"' <<<"$html" | sed -E 's/.*content="([^"]+)"/\1/')
if [ -n "${EXPECTED_VERSION:-}" ]; then
  [ "$live_version" = "${EXPECTED_VERSION:0:7}" ] && pass "serving commit \`$live_version\`" \
    || bad "serving commit \`${live_version:-unknown}\`, expected \`${EXPECTED_VERSION:0:7}\`"
else
  pass "serving commit \`${live_version:-unknown}\`"
fi

echo; echo "#### Status codes"
[ "$(status /)" = 200 ] && pass "/ returns 200" || bad "/ returns $(status /)"
[ "$(status /robots.txt)" = 200 ] && pass "/robots.txt returns 200" || bad "/robots.txt returns $(status /robots.txt)"
[ "$(status /this-page-does-not-exist)" = 404 ] && pass "unknown page returns 404" || bad "unknown page returns $(status /this-page-does-not-exist)"
code=$(status /_headers); [ "$code" != 200 ] && pass "/_headers is not served ($code)" || bad "/_headers is publicly served"
[ "$(status /site.webmanifest)" = 200 ] && pass "/site.webmanifest returns 200" || bad "/site.webmanifest missing"
[ "$(status /og-image.jpg)" = 200 ] && pass "/og-image.jpg returns 200" || bad "/og-image.jpg missing"

echo; echo "#### Search blocking (preview)"
grep -q "Disallow: /" <<<"$robots" && pass "robots.txt disallows crawling" || bad "robots.txt allows crawling"
grep -q 'content="noindex, nofollow"' <<<"$html" && pass "page has noindex meta tag" || bad "noindex meta tag missing"

echo; echo "#### Link preview"
og=$(grep -oE '<meta property="og:image" content="[^"]+"' <<<"$html" | sed -E 's/.*content="([^"]+)"/\1/')
if [ -z "$og" ]; then bad "og:image tag missing"
else
  [ "${og%%/og-image*}" = "$base" ] && pass "og:image points at this host: \`$og\`" || bad "og:image points elsewhere: \`$og\`"
  ogtype=$(curl -sI "$og" | tr -d '\r' | grep -i '^content-type:' | cut -d' ' -f2-)
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$og")" = 200 ] && pass "preview image loads (\`$ogtype\`)" || bad "preview image does not load"
fi
grep -q "User-agent: facebookexternalhit" <<<"$robots" && pass "link-preview bots allowed in robots.txt" || bad "link-preview bots blocked by robots.txt"

echo; echo "#### Security headers on /"
for h in content-security-policy x-content-type-options x-frame-options referrer-policy permissions-policy strict-transport-security; do
  v=$(header / "$h")
  if [ -n "$v" ]; then pass "\`$h\`: \`$v\`"; else
    if [ "$h" = strict-transport-security ]; then echo "- ⚠️ \`$h\` not set (normal on workers.dev; set it on the custom domain)"; else bad "\`$h\` missing"; fi
  fi
done

echo; echo "#### Caching and compression"
asset=$(grep -oE '/_astro/[^"]+\.(woff2|avif|webp)' <<<"$html" | head -1)
if [ -n "$asset" ]; then
  cc=$(header "$asset" cache-control)
  echo "$cc" | grep -q immutable && pass "hashed asset \`$asset\` cached: \`$cc\`" || bad "hashed asset cache-control is \`$cc\`"
else bad "no hashed asset found in HTML"; fi
cc=$(header / cache-control); pass "HTML cache-control: \`${cc:-default}\`"
enc=$(curl -sI -H "Accept-Encoding: br, gzip" "$base/" | tr -d '\r' | grep -i '^content-encoding:' | cut -d' ' -f2-)
[ -n "$enc" ] && pass "HTML compressed: \`$enc\`" || bad "HTML not compressed"
ver=$(curl -s -o /dev/null -w "%{http_version}" "$base/"); pass "HTTP version: $ver"
size=$(curl -s --compressed -o /dev/null -w "%{size_download}" "$base/"); pass "HTML transfer size: $size bytes (compressed)"

exit $fail
