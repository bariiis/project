import type { SlotValues } from "./slot-encoding";

/** Serialises a value for an inline <script>: `<` can never start a closing tag or comment. */
function scriptLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Adds the builder's preview runtime to a block's reference.html:
 * - replaces the text of every `[data-slot="<key>"]` element with the user's value;
 * - points every `[data-slot-src="<key>"]` image/video at the user's https URL, or at our own
 *   sample file (`demoMedia`, same-origin `/media/demo/...` paths built by the caller);
 * - reports the height of the `[data-block]` root to the parent frame as `{ type: "ps:height" }`.
 *
 * It is a classic inline script at the end of <body>, so it runs before the page's deferred
 * module scripts and they (word splitting, tickers, wordmark fitting) see the new text.
 */
export function injectPreview(
  html: string,
  slug: string,
  values: SlotValues,
  demoMedia: Record<string, string> = {},
): string {
  const script = `<script>(() => {
  const values = ${scriptLiteral(values)};
  const demo = ${scriptLiteral(demoMedia)};
  const setSrc = (key, src) => {
    for (const el of document.querySelectorAll('[data-slot-src="' + key + '"]')) {
      el.setAttribute("src", src);
      if (el instanceof HTMLVideoElement) el.load();
    }
  };
  for (const [key, value] of Object.entries(values)) {
    for (const el of document.querySelectorAll('[data-slot="' + key + '"]')) el.textContent = value;
    if (value.startsWith("https://")) setSrc(key, value);
  }
  for (const [key, src] of Object.entries(demo)) if (src.startsWith("/media/demo/")) setSrc(key, src);
  const root = document.querySelector("[data-block]");
  if (!root || window.parent === window) return;
  let last = 0;
  const send = () => {
    const height = Math.ceil(root.getBoundingClientRect().height);
    if (height && height !== last) {
      last = height;
      window.parent.postMessage({ type: "ps:height", slug: ${scriptLiteral(slug)}, height }, "*");
    }
  };
  addEventListener("load", send);
  new ResizeObserver(send).observe(root);
  if (document.fonts) document.fonts.ready.then(send);
})();</script>`;

  const at = html.lastIndexOf("</body>");
  return at === -1 ? html + script : html.slice(0, at) + script + html.slice(at);
}
