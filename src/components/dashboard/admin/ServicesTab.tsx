"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CatalogueHeader } from "./services/CatalogueHeader";
import { CatalogueNavTabs, CatalogueSubTab } from "./services/CatalogueNavTabs";
import { CatalogueKpiCards } from "./services/CatalogueKpiCards";
import { CatalogueOverviewTab } from "./services/CatalogueOverviewTab";
import { CatalogueServicesTab } from "./services/CatalogueServicesTab";
import { CataloguePackagesTab } from "./services/CataloguePackagesTab";
import { CatalogueCategoriesTab } from "./services/CatalogueCategoriesTab";
import { CataloguePricePlansTab } from "./services/CataloguePricePlansTab";
import { CatalogueAvailabilityTab } from "./services/CatalogueAvailabilityTab";
import { CatalogueBookingsTab } from "./services/CatalogueBookingsTab";
import { CatalogueSettingsTab } from "./services/CatalogueSettingsTab";
import { AddServiceModal } from "./services/AddServiceModal";
import { PackageBuilderModal } from "./services/PackageBuilderModal";
import { AddCategoryModal } from "./services/AddCategoryModal";
import { AssignDoctorsModal } from "./services/AssignDoctorsModal";
import {
  ServiceItem,
  ServiceCategoryItem,
  PackageItem,
  CatalogueStats,
} from "./services/types";
import { api } from "@/lib/api/client";

interface ServicesTabProps {
  showNotification: (msg: string, isErr?: boolean) => void;
  onQuickBook?: () => void;
}

export function ServicesTab({ showNotification, onQuickBook }: ServicesTabProps) {
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<CatalogueSubTab>("overview");

  // Data states
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [stats, setStats] = useState<CatalogueStats | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  const [isAssignDoctorsOpen, setIsAssignDoctorsOpen] = useState(false);
  const [selectedServiceForDoctors, setSelectedServiceForDoctors] = useState<ServiceItem | null>(null);

  // 1. Load all services, categories, packages, and stats
  const loadCatalogueData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      const [servicesRes, categoriesRes, packagesRes, statsRes] = await Promise.all([
        api.get<{ services: ServiceItem[] }>("/services?limit=100"),
        api.get<{ categories: ServiceCategoryItem[] }>("/services/categories"),
        api.get<{ packages: PackageItem[] }>("/packages"),
        api.get<{ stats: CatalogueStats }>("/services/stats"),
      ]);

      if (servicesRes.data?.services) {
        setServices(servicesRes.data.services);
      }
      if (categoriesRes.data?.categories) {
        setCategories(categoriesRes.data.categories);
      }
      if (packagesRes.data?.packages) {
        setPackages(packagesRes.data.packages);
      }
      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
    } catch {
      showNotification("Failed to load catalogue data", true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadCatalogueData();
  }, [loadCatalogueData]);

  // Handler: Service Add / Update Success
  const handleServiceSaved = (saved: ServiceItem) => {
    setIsAddServiceOpen(false);
    setEditingService(null);
    setServices((prev) => {
      const idx = prev.findIndex((s) => s._id === saved._id || s.code === saved.code);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    loadCatalogueData(true);
  };

  // Handler: Package Add / Update Success
  const handlePackageSaved = (saved: PackageItem) => {
    setIsAddPackageOpen(false);
    setEditingPackage(null);
    setPackages((prev) => {
      const idx = prev.findIndex((p) => p._id === saved._id || p.slug === saved.slug);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    loadCatalogueData(true);
  };

  // Handler: Category Add Success
  const handleCategorySaved = (newCat: ServiceCategoryItem) => {
    setIsAddCategoryOpen(false);
    setCategories((prev) => [...prev, newCat]);
    loadCatalogueData(true);
  };

  // Handler: Quick Toggle Service Status (Draft ↔ Active)
  const handleToggleStatus = async (srv: ServiceItem) => {
    const nextStatus = srv.status === "active" ? "draft" : "active";
    // Optimistic UI update
    setServices((prev) =>
      prev.map((s) => (s._id === srv._id ? { ...s, status: nextStatus, isPublished: nextStatus === "active" } : s))
    );

    try {
      const res = await api.patch<{ service: ServiceItem }>(`/services/${srv._id}`, {
        status: nextStatus,
        isPublished: nextStatus === "active",
      });
      if (res.data?.service) {
        showNotification(
          `Service '${srv.name}' is now ${nextStatus === "active" ? "Published (Active)" : "Draft (Hidden from Public)"}`
        );
      }
    } catch {
      showNotification("Failed to update service status", true);
      loadCatalogueData(true);
    }
  };

  // Handler: Deactivate Service
  const handleDeleteService = async (srv: ServiceItem) => {
    if (!window.confirm(`Are you sure you want to deactivate service '${srv.name}' (${srv.code})?`)) {
      return;
    }

    try {
      await api.delete(`/services/${srv._id}`);
      showNotification(`Service '${srv.name}' deactivated`);
      setServices((prev) => prev.filter((s) => s._id !== srv._id));
      loadCatalogueData(true);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error deactivating service", true);
    }
  };

  // Handler: Delete Package
  const handleDeletePackage = async (pkg: PackageItem) => {
    if (!window.confirm(`Are you sure you want to delete package '${pkg.name}'?`)) {
      return;
    }

    try {
      await api.delete(`/packages/${pkg._id}`);
      showNotification(`Package '${pkg.name}' deleted`);
      setPackages((prev) => prev.filter((p) => p._id !== pkg._id));
      loadCatalogueData(true);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error deleting package", true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Master Header Card (Screenshot top banner) */}
      <CatalogueHeader
        onAddNewService={() => {
          setEditingService(null);
          setIsAddServiceOpen(true);
        }}
        onCreatePackage={() => {
          setEditingPackage(null);
          setIsAddPackageOpen(true);
        }}
        onAddCategory={() => setIsAddCategoryOpen(true)}
        onRefresh={() => loadCatalogueData(true)}
        isRefreshing={isRefreshing}
      />

      {/* 2. Navigation Pill Tabs (Screenshot sub-navigation) */}
      <CatalogueNavTabs
        activeTab={activeSubTab}
        onTabChange={setActiveSubTab}
        serviceCount={services.length}
        packageCount={packages.length}
      />

      {/* 3. 4 Metric KPI Cards (Screenshot KPI Row) */}
      <CatalogueKpiCards stats={stats} isLoading={isLoading} />

      {/* 4. Active Sub-View Content */}
      {activeSubTab === "overview" && (
        <CatalogueOverviewTab
          services={services}
          categories={categories}
          isLoading={isLoading}
          onAddNewService={() => {
            setEditingService(null);
            setIsAddServiceOpen(true);
          }}
          onEditService={(srv) => {
            setEditingService(srv);
            setIsAddServiceOpen(true);
          }}
          onAssignDoctors={(srv) => {
            setSelectedServiceForDoctors(srv);
            setIsAssignDoctorsOpen(true);
          }}
          onToggleStatus={handleToggleStatus}
          onDeleteService={handleDeleteService}
          onAddCategory={() => setIsAddCategoryOpen(true)}
        />
      )}

      {activeSubTab === "services" && (
        <CatalogueServicesTab
          services={services}
          categories={categories}
          isLoading={isLoading}
          onAddNewService={() => {
            setEditingService(null);
            setIsAddServiceOpen(true);
          }}
          onEditService={(srv) => {
            setEditingService(srv);
            setIsAddServiceOpen(true);
          }}
          onAssignDoctors={(srv) => {
            setSelectedServiceForDoctors(srv);
            setIsAssignDoctorsOpen(true);
          }}
          onToggleStatus={handleToggleStatus}
          onDeleteService={handleDeleteService}
        />
      )}

      {activeSubTab === "packages" && (
        <CataloguePackagesTab
          packages={packages}
          isLoading={isLoading}
          onAddNewPackage={() => {
            setEditingPackage(null);
            setIsAddPackageOpen(true);
          }}
          onEditPackage={(pkg) => {
            setEditingPackage(pkg);
            setIsAddPackageOpen(true);
          }}
          onDeletePackage={handleDeletePackage}
          showNotification={showNotification}
        />
      )}

      {activeSubTab === "categories" && (
        <CatalogueCategoriesTab
          categories={categories}
          onAddCategory={() => setIsAddCategoryOpen(true)}
        />
      )}

      {activeSubTab === "price-plans" && (
        <CataloguePricePlansTab services={services} packages={packages} />
      )}

      {activeSubTab === "availability" && (
        <CatalogueAvailabilityTab
          services={services}
          showNotification={showNotification}
          onBookSlot={(service, doctorId, date, time) => {
            if (onQuickBook) onQuickBook();
            else showNotification(`Confirmed slot at ${time} on ${date} for ${service.name}!`);
          }}
        />
      )}

      {activeSubTab === "bookings" && (
        <CatalogueBookingsTab
          onQuickBook={onQuickBook}
          showNotification={showNotification}
        />
      )}

      {activeSubTab === "settings" && (
        <CatalogueSettingsTab showNotification={showNotification} />
      )}

      {/* ==============================================================
          MODALS & DRAWERS
          ============================================================== */}
      {isAddServiceOpen && (
        <AddServiceModal
          isOpen={isAddServiceOpen}
          onClose={() => {
            setIsAddServiceOpen(false);
            setEditingService(null);
          }}
          onSuccess={handleServiceSaved}
          categories={categories}
          editService={editingService}
          showNotification={showNotification}
        />
      )}

      {isAddPackageOpen && (
        <PackageBuilderModal
          isOpen={isAddPackageOpen}
          onClose={() => {
            setIsAddPackageOpen(false);
            setEditingPackage(null);
          }}
          onSuccess={handlePackageSaved}
          categories={categories}
          editPackage={editingPackage}
          showNotification={showNotification}
        />
      )}

      {isAddCategoryOpen && (
        <AddCategoryModal
          isOpen={isAddCategoryOpen}
          onClose={() => setIsAddCategoryOpen(false)}
          onSuccess={handleCategorySaved}
          showNotification={showNotification}
        />
      )}

      {isAssignDoctorsOpen && selectedServiceForDoctors && (
        <AssignDoctorsModal
          service={selectedServiceForDoctors}
          isOpen={isAssignDoctorsOpen}
          onClose={() => {
            setIsAssignDoctorsOpen(false);
            setSelectedServiceForDoctors(null);
          }}
          onSuccess={(updated) => {
            setIsAssignDoctorsOpen(false);
            setSelectedServiceForDoctors(null);
            handleServiceSaved(updated);
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}
