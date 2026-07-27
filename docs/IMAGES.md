# Why car photos skip Vercel's image optimizer

**Symptom this fixes:** photos added to a car in DealerCenter show up on the
website as a blank/broken image, while older photos still load fine.

**Cause.** Every `next/image` render of a remote URL at a new width/quality is
one *Image Optimization transformation*. The Hobby plan includes 5,000 a month.
Each car photo was being transformed up to four ways (grid card, gallery main,
96px thumbnail, lightbox) across several breakpoints — with ~30 cars and ~400
photos that blows through 5,000 quickly. Once the quota is gone Vercel stops
performing **new** transformations and `/_next/image` answers `402 Payment
Required`; already-cached sizes keep serving. That is exactly the reported
symptom: old photos fine, new photos blank.

Confirmed against production on 2026-07-27 — an uncached size returned:

```
HTTP/2 402
```

**Fix.** Car photos are already served pre-sized (800x600) from DealerCenter's
own CDN (`imagesdl.dealercenter.net`), so there is nothing for Vercel to gain by
re-encoding them. Every `<Image>` that renders a vehicle photo carries
`unoptimized`, which points the browser straight at the source URL and costs
zero transformations:

- `src/components/VehicleCard.tsx`
- `src/components/VehicleGallery.tsx` (main, thumbnails, lightbox)
- `src/components/SimilarVehicles.tsx`

Static site assets (logo, staff photos, the wheel) are a handful of files and
still go through the optimizer — they cannot meaningfully move the counter.

**If a new photo surface is added**, add `unoptimized` to it as well. Leaving it
off is not a build error; it just quietly starts spending quota again.

Usage lives at Vercel → the `ryan-duarte-s-projects` team → Usage → Image
Optimization. It resets each billing period.
