# Nav layout fix — mobile overlap

One file, no migration, no install.

```powershell
cd C:\Users\admin\Downloads\ai-productivity
Expand-Archive -Path $HOME\Downloads\nadi-nav-fix.zip -DestinationPath . -Force
npm run verify
```

Then push:

```powershell
git add .
git commit -m "Fix nav overlap on narrow phone widths"
git push
```

Deploys the same way as before. No env vars, no Vercel settings to touch.

## What was wrong

The nav was one flex row: workspace name on the left, five links plus three
icon buttons on the right, `justify-between`. On a desktop window there is
room for all of that. On a real phone (~380–430px), there is not — five links
plus three icons is closer to 460px of content.

Flexbox's default response to that is not overlap, it is shrinking: each item
gets squeezed narrower. But the `<a>` tags had no `shrink-0` or
`whitespace-nowrap`, so their *boxes* shrank while the *text* inside them did
not — and text that no longer fits its box does not disappear, it overflows
into whatever is next to it. That is exactly what "RaTulsks" was: "Rahul" and
"Tasks" occupying the same pixels.

## The fix

Two rows below the `sm` breakpoint, one row above it — `flex-col` on mobile,
`flex-row` from `sm:` up. This is a stronger fix than tuning gaps or font
sizes, which would only move the same failure to a slightly narrower phone.
Stacked rows cannot occupy the same space; the overlap becomes structurally
impossible rather than merely less likely.

The five links live in a horizontally-scrollable strip on their own row,
rather than wrapping onto more lines. A two-line "Tasks / Habits / Calendar"
wrap reads as broken; a swipeable strip reads as intentional — it is the same
pattern as tabs in any app with more sections than fit on screen. Each link
now carries `shrink-0 whitespace-nowrap`, so the scroll is the *only* way this
row responds to a narrow width, rather than silently repeating the original
bug at a smaller size.

The bell, theme toggle, and sign-out button are written once and rendered
twice — beside the workspace name on mobile (so the icon row isn't left
homeless above an empty stretch of bar), and at the end of the link strip from
`sm:` up (matching the original desktop layout exactly). `sm:hidden` /
`hidden sm:flex` performs the move; there is no duplicated state or click
handler, just two render sites gated by breakpoint.
