/**
 * A.R.E.S. Embed Widget
 *
 * Drop this on any external website to embed the ARES chat assistant.
 *
 * Usage:
 *   <script src="https://your-domain.com/widget.js" data-slug="your-store-slug" async></script>
 *
 * Or with custom config:
 *   <script src="https://your-domain.com/widget.js"
 *     data-slug="your-store-slug"
 *     data-position="bottom-right"
 *     data-theme="green"
 *     async>
 *   </script>
 */
(function () {
  "use strict";

  if (window.__ARES_EMBED_LOADED__) return;
  window.__ARES_EMBED_LOADED__ = true;

  function getCurrentScript() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  }

  var script = getCurrentScript();
  var slug = script.getAttribute("data-slug");
  if (!slug) {
    console.error("[ARES Embed] Missing data-slug attribute");
    return;
  }

  var position = script.getAttribute("data-position") || "bottom-right";
  var origin = script.src.match(/^(https?:\/\/[^/]+)/);
  var baseUrl = origin ? origin[1] : "";

  // Bubble button
  var bubble = document.createElement("button");
  bubble.style.cssText = [
    "position: fixed",
    "z-index: 2147483000",
    "border: none",
    "cursor: pointer",
    "width: 60px",
    "height: 60px",
    "border-radius: 50%",
    "background: #25D366",
    "color: white",
    "box-shadow: 0 8px 24px rgba(7,94,84,0.35)",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "transition: transform 0.2s ease",
  ].concat(position === "bottom-left" ? ["left: 20px", "bottom: 20px"] : ["right: 20px", "bottom: 20px"]).join(";");

  bubble.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  // Iframe container
  var container = document.createElement("div");
  container.style.cssText = [
    "position: fixed",
    "z-index: 2147483001",
    "width: 380px",
    "height: 600px",
    "max-height: 90vh",
    "border: none",
    "border-radius: 16px",
    "overflow: hidden",
    "box-shadow: 0 20px 60px rgba(0,0,0,0.3)",
    "display: none",
    "background: white",
  ].concat(position === "bottom-left" ? ["left: 20px", "bottom: 90px"] : ["right: 20px", "bottom: 90px"]).join(";");

  var iframe = document.createElement("iframe");
  iframe.src = baseUrl + "/embed/" + encodeURIComponent(slug);
  iframe.style.cssText = "width:100%;height:100%;border:none;";
  iframe.setAttribute("allow", "microphone; camera; clipboard-read; clipboard-write");
  iframe.setAttribute("title", "ARES Assistant");
  container.appendChild(iframe);

  // Close button overlay
  var closeBtn = document.createElement("button");
  closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.style.cssText = [
    "position: absolute",
    "top: 8px",
    "right: 8px",
    "width: 28px",
    "height: 28px",
    "border-radius: 50%",
    "border: none",
    "background: rgba(255,255,255,0.9)",
    "color: #075E54",
    "cursor: pointer",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "z-index: 2",
  ].join(";");

  container.appendChild(closeBtn);

  var isOpen = false;
  function toggle() {
    isOpen = !isOpen;
    bubble.style.display = isOpen ? "none" : "flex";
    container.style.display = isOpen ? "block" : "none";
  }

  bubble.addEventListener("click", toggle);
  closeBtn.addEventListener("click", toggle);
  bubble.addEventListener("mouseenter", function () {
    bubble.style.transform = "scale(1.08)";
  });
  bubble.addEventListener("mouseleave", function () {
    bubble.style.transform = "scale(1)";
  });

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    document.body.appendChild(bubble);
    document.body.appendChild(container);
  });

  // Public API
  window.ARES = window.ARES || {};
  window.ARES.open = function () { if (!isOpen) toggle(); };
  window.ARES.close = function () { if (isOpen) toggle(); };
})();
