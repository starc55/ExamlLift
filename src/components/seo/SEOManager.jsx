import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_FAVICON,
  DEFAULT_OG_IMAGE,
  getCanonicalUrl,
  getSiteUrl,
  resolveSeoMeta,
  SITE_NAME,
} from "../../config/seo";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertLink(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function SEOManager() {
  const location = useLocation();

  useEffect(() => {
    const meta = resolveSeoMeta(location.pathname);
    const title = meta.title || SITE_NAME;
    const description = meta.description || DEFAULT_DESCRIPTION;
    const canonicalUrl = getCanonicalUrl(location.pathname);
    const imageUrl = `${getSiteUrl()}${DEFAULT_OG_IMAGE}`;

    document.title = title;
    upsertMeta('meta[name="description"]', {
      name: "description",
      content: description,
    });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: meta.robots || "index,follow",
    });
    upsertMeta('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: SITE_NAME,
    });
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: title,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: "website",
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: imageUrl,
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: title,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: imageUrl,
    });
    upsertLink('link[rel="canonical"]', {
      rel: "canonical",
      href: canonicalUrl,
    });
    upsertLink('link[rel="icon"]', {
      rel: "icon",
      type: "image/png",
      href: DEFAULT_FAVICON,
    });
    upsertLink('link[rel="apple-touch-icon"]', {
      rel: "apple-touch-icon",
      href: DEFAULT_FAVICON,
    });
  }, [location.pathname]);

  return null;
}

export default SEOManager;
