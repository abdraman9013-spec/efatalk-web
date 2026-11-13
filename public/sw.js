const SW_VERSION = "efaa-sw-9";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "EFA Talk", body: "Le match commence bientôt.", url: "/lobby/beginner" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    try {
      if (event.data) data.body = event.data.text();
    } catch {
      /* keep default */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "EFA Talk", {
      body: data.body,
      icon: "/icons/icon-192.png?v=6",
      badge: "/icons/icon-192.png?v=6",
      tag: "efaa-flame",
      renotify: true,
      requireInteraction: true,
      vibrate: [220, 80, 220, 80, 320],
      data: { url: data.url || "/lobby/beginner" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/lobby/beginner";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const hit = windows.find((client) => "focus" in client);
      if (hit) {
        if ("navigate" in hit && typeof hit.navigate === "function") hit.navigate(target);
        return hit.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  const dest = req.destination;
  if (req.mode === "navigate" || dest === "document" || (dest === "" && req.headers.get("accept")?.includes("text/html"))) {
    return;
  }
  if (url.protocol === "blob:" || url.protocol === "data:" || url.protocol === "file:") return;
  if (url.hostname.toLowerCase().endsWith("daily.co")) return;
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/sw.js") return;
  if (dest === "unknown") return;

  event.respondWith(fetch(req));
});

void SW_VERSION;
