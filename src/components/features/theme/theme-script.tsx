/**
 * Runs before first paint to apply the saved theme.
 *
 * Without this, the page renders light, then React hydrates and switches to
 * dark — a white flash on every navigation for dark-mode users. The script is
 * deliberately tiny and inline: a separate file would be a network round trip
 * during which the flash happens anyway.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem("nadi-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
