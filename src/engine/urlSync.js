export const DEFAULT_CODE = `$.on('button', 'click', function onClick() {
    setTimeout(function timer() {
        console.log('You clicked the button!');    
    }, 2000);
});

console.log("Hi!");

setTimeout(function timeout() {
    console.log("Click the button!");
}, 5000);

console.log("Welcome to loupe.");`;

export const DEFAULT_HTML = `<button id="btn">Click me!</button>`;

/**
 * Safely encode Unicode string to base64
 */
function utf8ToBase64(str) {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch (e) {
    return btoa(str);
  }
}

/**
 * Safely decode base64 to Unicode string
 */
function base64ToUtf8(str) {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    try {
      return atob(str);
    } catch {
      return '';
    }
  }
}

export function encodeUrlState(code, html) {
  const codeB64 = utf8ToBase64(code || '');
  const htmlB64 = utf8ToBase64(html || '');
  return `${codeB64}!!!${htmlB64}`;
}

export function decodeUrlState(search = window.location.search) {
  if (!search) return null;
  const match = search.match(/[?&]code=([^&]*)/);
  if (!match || !match[1]) return null;

  try {
    const raw = decodeURIComponent(match[1]);
    const parts = raw.split('!!!');
    const code = base64ToUtf8(parts[0] || '');
    const html = parts[1] ? base64ToUtf8(parts[1]) : '';

    // If both code and html are empty (e.g. "?code=!!!"), return null so default loads
    if (!code.trim() && !html.trim()) {
      return null;
    }

    return {
      code: code || DEFAULT_CODE,
      html: html || DEFAULT_HTML
    };
  } catch (err) {
    console.warn('Failed to decode URL state:', err);
    return null;
  }
}

export function updateUrlQuery(code, html) {
  try {
    const encoded = encodeUrlState(code, html);
    const newUrl = `${window.location.pathname}?code=${encodeURIComponent(encoded)}`;
    window.history.replaceState(null, '', newUrl);
  } catch (err) {
    console.warn('Failed to update URL:', err);
  }
}
