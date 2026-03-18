export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/radio") {
      return proxyRadioStream();
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return response;
    }

    if (looksLikeAssetRequest(url.pathname)) {
      return response;
    }

    const fallbackUrl = new URL(request.url);
    fallbackUrl.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
  },
};

function looksLikeAssetRequest(pathname) {
  return pathname.includes(".") || pathname.startsWith("/assets/");
}

async function proxyRadioStream() {
  const upstreamUrl = "https://radio.coreyburns.ca/radio.ogg";

  try {
    const response = await fetch(upstreamUrl, {
      headers: { "User-Agent": "Cloudflare-Worker" },
    });

    if (!response.ok) {
      return new Response(
        `Error: Radio server returned ${response.status} ${response.statusText}`,
        {
          status: response.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Error fetching audio stream: ${message}`, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
