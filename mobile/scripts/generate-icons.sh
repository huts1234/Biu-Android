#!/usr/bin/env bash
# Regenerates launcher icons and splash screens for the phone / pad flavors.
# Requires: rsvg-convert, ImageMagick (magick or convert).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID="$HERE/android"

if command -v magick >/dev/null 2>&1; then
  IM=magick
else
  IM=convert
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

note='<g fill="#ffffff">
  <ellipse cx="392" cy="708" rx="84" ry="62" transform="rotate(-18 392 708)"/>
  <ellipse cx="690" cy="632" rx="84" ry="62" transform="rotate(-18 690 632)"/>
  <rect x="450" y="382" width="36" height="326" rx="18"/>
  <rect x="748" y="306" width="36" height="326" rx="18"/>
  <path d="M450 382 L784 300 L784 382 L450 464 Z"/>
</g>'

render_icon() {
  local c1="$1" c2="$2" out="$3" rounded="$4"
  local radius=0
  if [ "$rounded" = "rounded" ]; then radius=224; fi

  cat >"$TMP/icon.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="$c1"/>
      <stop offset="0.55" stop-color="$c1"/>
      <stop offset="1" stop-color="$c2"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1024" height="1024" rx="$radius" fill="url(#g)"/>
  $note
</svg>
EOF

  rsvg-convert -w 1024 -h 1024 "$TMP/icon.svg" -o "$out"
}

stage_flavor() {
  local flavor="$1" c1="$2" c2="$3" color="$4"
  local res="$ANDROID/app/src/$flavor/res"
  local base="$TMP/$flavor"

  mkdir -p "$res/values" "$res/mipmap-anydpi-v26"

  render_icon "$c1" "$c2" "$base-icon.png" square
  render_icon "$c1" "$c2" "$base-icon-rounded.png" rounded

  # legacy launcher icons
  for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
    density="${pair%%:*}"
    size="${pair##*:}"
    mkdir -p "$res/mipmap-$density"

    $IM "$base-icon-rounded.png" -resize "${size}x${size}" "$res/mipmap-$density/ic_launcher.png"

    $IM "$base-icon-rounded.png" -resize "${size}x${size}" \
      \( -size "${size}x${size}" xc:none -fill white -draw "circle $((size / 2)),$((size / 2)) $((size / 2)),0" \) \
      -alpha set -compose DstIn -composite "$res/mipmap-$density/ic_launcher_round.png"
  done

  # adaptive foreground (108dp), logo already sits inside the safe zone
  for pair in mdpi:108 hdpi:162 xhdpi:216 xxhdpi:324 xxxhdpi:432; do
    density="${pair%%:*}"
    size="${pair##*:}"
    $IM "$base-icon.png" -resize "${size}x${size}" "$res/mipmap-$density/ic_launcher_foreground.png"
  done

  cp "$ANDROID/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml" "$res/mipmap-anydpi-v26/ic_launcher.xml"
  cp "$ANDROID/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml" "$res/mipmap-anydpi-v26/ic_launcher_round.xml"

  cat >"$res/values/ic_launcher_background.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">$color</color>
</resources>
EOF

  cat >"$res/values/strings.xml" <<EOF
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Biu for ${flavor^}</string>
    <string name="title_activity_main">Biu for ${flavor^}</string>
    <string name="package_name">com.biu.music.$flavor</string>
    <string name="custom_url_scheme">com.biu.music.$flavor</string>
</resources>
EOF

  # splash screens: dark canvas with the app mark in the middle
  for file in "$ANDROID/app/src/main/res"/drawable*/splash.png; do
    rel="${file#"$ANDROID/app/src/main/res/"}"
    target="$res/$rel"
    mkdir -p "$(dirname "$target")"

    read -r width height < <($IM identify -format '%w %h\n' "$file")
    side=$((width < height ? width : height))
    logo=$((side * 30 / 100))

    $IM -size "${width}x${height}" xc:'#0b0b0d' \
      \( "$base-icon-rounded.png" -resize "${logo}x${logo}" \) \
      -gravity center -composite "$target"
  done
}

stage_flavor phone "#ff375f" "#ff9f0a" "#ff375f"
stage_flavor pad "#5b7cfa" "#b06bff" "#5b7cfa"

echo "Icons and splash screens generated for phone / pad."
