import { MetadataRoute } from "next";
import { servicesData } from "@/data/servicesData";
import { articlesData } from "@/data/articlesData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://trigyna.com";

  const staticRoutes = [
    "",
    "/about",
    "/doctor",
    "/services",
    "/health-tips",
    "/contact",
    "/faq",
    "/privacy-policy",
    "/terms-and-conditions",
    "/refund-policy",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  const serviceRoutes = servicesData.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const articleRoutes = articlesData.map((article) => ({
    url: `${baseUrl}/health-tips/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...serviceRoutes, ...articleRoutes];
}
