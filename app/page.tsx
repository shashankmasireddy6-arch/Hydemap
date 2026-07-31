"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import FilterBar, { BudgetRange } from "@/components/FilterBar";
import Legend from "@/components/Legend";
import AddPostButton from "@/components/AddPostButton";
import ResultsCount from "@/components/ResultsCount";
import CreatePostModal from "@/components/CreatePostModal";
import PickLocationBanner from "@/components/PickLocationBanner";
import SelectedLocationBadge from "@/components/SelectedLocationBadge";
import RentInsightsCard from "@/components/RentInsightsCard";
import SearchBar from "@/components/SearchBar";
import { LatLng, PostType, Property } from "@/types/post";
import { filterProperties } from "@/lib/filterProperties";
import { calculateAverageRent, calculateRentPaidRange } from "@/lib/rentInsights";
import {
  buildPropertyFromForm,
  CreatePostFormState,
  DEFAULT_CREATE_POST_FORM,
} from "@/lib/createPostForm";
import { fetchPosts, addPost, uploadPostPhotos } from "@/lib/postsService";
import { isFirebaseConfigured } from "@/lib/firebase";
import demoPropertiesData from "@/data/properties.json";

// Google Maps touches the DOM directly, so it must load client-side only.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

// Used only as a fallback so the app is still usable before Firebase is
// configured, or if a Firestore request fails — see the useEffect below.
const DEMO_PROPERTIES = demoPropertiesData as Property[];

const BUDGET_LIMITS: BudgetRange = { min: 0, max: 10000000 };

export default function HomePage() {
  // Posts now live in Firestore; this is just the in-memory copy the UI
  // renders from, populated by fetchPosts() on load and appended to after
  // a successful addPost().
  const [posts, setPosts] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // True if we're showing the local properties.json fallback instead of
  // real Firestore data (not configured yet, or the fetch failed).
  const [usingDemoData, setUsingDemoData] = useState(false);

  const [selectedType, setSelectedType] = useState<PostType | "All">("All");
  const [budget, setBudget] = useState<BudgetRange>(BUDGET_LIMITS);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [form, setForm] = useState<CreatePostFormState>(DEFAULT_CREATE_POST_FORM);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  // A location the user has tapped on the map but not yet submitted as a
  // post. Drives the pulsing temp marker and pre-fills the form.
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);

  // The underlying google.maps.Map instance, handed up by MapView once
  // created — lets SearchBar drive panTo/zoom/markers directly.
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Fetch posts from Firestore once on load.
  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      if (!isFirebaseConfigured) {
        // No .env.local set up yet — fall back to the bundled demo data
        // instead of trying (and failing) to hit Firestore.
        if (!cancelled) {
          setPosts(DEMO_PROPERTIES);
          setUsingDemoData(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        const fetched = await fetchPosts();
        if (!cancelled) {
          setPosts(fetched);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch posts from Firestore:", err);
        if (!cancelled) {
          setPosts(DEMO_PROPERTIES);
          setUsingDemoData(true);
          setIsLoading(false);
        }
      }
    }

    loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Recomputed only when the filter values actually change, so marker
  // updates stay real-time without re-filtering on unrelated re-renders.
  const filteredProperties = useMemo(
    () => filterProperties(posts, { type: selectedType, price: budget }),
    [posts, selectedType, budget]
  );

  // Rent insights are derived from whatever is currently visible on the
  // map, so panning/filtering to a different area recomputes them live.
  const averageRent = useMemo(
    () => calculateAverageRent(filteredProperties),
    [filteredProperties]
  );
  const rentPaidRange = useMemo(
    () => calculateRentPaidRange(filteredProperties),
    [filteredProperties]
  );

  const openModalWithLocation = (location: LatLng | null) => {
    setForm({
      ...DEFAULT_CREATE_POST_FORM,
      latitude: location ? location.lat.toFixed(6) : "",
      longitude: location ? location.lng.toFixed(6) : "",
    });
    setFormError(undefined);
    setIsModalOpen(true);
  };

  // Floating "Add Post" button: opens a fresh form, pre-filled with
  // whatever location is currently pinned on the map, if any.
  const handleAddPostClick = () => openModalWithLocation(selectedLocation);

  const handleFormChange = (patch: Partial<CreatePostFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handlePickLocation = () => {
    // Hide the modal so the map underneath is clickable, then wait for a
    // map click to come back through handleMapClick.
    setIsModalOpen(false);
    setIsPickingLocation(true);
  };

  const handleCancelPicking = () => {
    setIsPickingLocation(false);
    setIsModalOpen(true);
  };

  const handleMapClick = useCallback(
    (lng: number, lat: number) => {
      if (isPickingLocation) {
        // Re-pick flow: update the open form directly and reopen the modal.
        setForm((prev) => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
        setSelectedLocation({ lat, lng });
        setIsPickingLocation(false);
        setIsModalOpen(true);
        return;
      }

      // Normal browsing: just drop/move the temporary pin. The form only
      // picks this up once "Add Post" (or the badge's shortcut) is used.
      setSelectedLocation({ lat, lng });
    },
    [isPickingLocation]
  );

  const handleClearSelectedLocation = () => setSelectedLocation(null);

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setFormError(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = buildPropertyFromForm(form);

    if (error || !data) {
      setFormError(error ?? "Something went wrong. Please check the form.");
      return;
    }

    setFormError(undefined);
    setIsSubmitting(true);

    try {
      let newPost: Property;

      // Photos are uploaded to Firebase Storage up front so their URLs can
      // ride along with the initial Firestore write, rather than creating
      // the post and then patching it in a second round trip.
      let photoUrls: string[] = [];
      if (form.photos.length > 0) {
        photoUrls = isFirebaseConfigured
          ? await uploadPostPhotos(form.photos)
          : form.photos.map((file) => URL.createObjectURL(file));
      }
      const dataWithPhotos = photoUrls.length > 0 ? { ...data, photoUrls } : data;

      if (usingDemoData) {
        // Firestore isn't configured — keep the demo interactive by
        // storing the new post locally instead. `email` is dropped here
        // too, for consistency with addPost() never returning it.
        const { email, ...publicData } = dataWithPhotos;
        newPost = { id: `local-${Date.now()}`, ...publicData };
      } else {
        // Add new post to Firestore; Firestore assigns the document id.
        newPost = await addPost(dataWithPhotos);
      }

      // Add to local state so the marker shows up immediately — no need
      // to re-fetch the whole collection.
      setPosts((prev) => [...prev, newPost]);
      setIsModalOpen(false);
      setForm(DEFAULT_CREATE_POST_FORM);
      // The pin is now a real post marker, so drop the temporary one.
      setSelectedLocation(null);
    } catch (err) {
      console.error("Failed to add post to Firestore:", err);
      setFormError("Couldn't save the post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSelectedLocationBadge = selectedLocation && !isModalOpen && !isPickingLocation;

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <MapView
        properties={filteredProperties}
        onMapClick={handleMapClick}
        isPickingLocation={isPickingLocation}
        pendingLocation={selectedLocation}
        onMapReady={setMap}
      />

      {/* Top area: search, results count, filter bar / picking banner, insights, location badge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-3 sm:p-4">
        {!isPickingLocation && <SearchBar map={map} />}
        {isLoading ? (
          <div className="pointer-events-auto rounded-full border border-slate-100 bg-white/95 px-4 py-1.5 text-xs font-medium text-slate-500 shadow-panel backdrop-blur-md">
            Loading posts…
          </div>
        ) : (
          <>
            <ResultsCount visible={filteredProperties.length} total={posts.length} />
            {isPickingLocation ? (
              <PickLocationBanner onCancel={handleCancelPicking} />
            ) : (
              <FilterBar
                selectedType={selectedType}
                onTypeChange={setSelectedType}
                budget={budget}
                onBudgetChange={setBudget}
                budgetLimits={BUDGET_LIMITS}
              />
            )}
            <RentInsightsCard averageRent={averageRent} rentPaidRange={rentPaidRange} />
            {usingDemoData && (
              <div className="pointer-events-auto rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-medium text-amber-800">
                Showing demo data — add your Firebase config to save real posts (see README).
              </div>
            )}
            {showSelectedLocationBadge && selectedLocation && (
              <SelectedLocationBadge
                latitude={selectedLocation.lat}
                longitude={selectedLocation.lng}
                onAddPost={handleAddPostClick}
                onClear={handleClearSelectedLocation}
              />
            )}
          </>
        )}
      </div>

      {/* Legend, bottom right */}
      <div className="pointer-events-none absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
        <Legend />
      </div>

      {/* Floating Add Post button, bottom left */}
      <div className="pointer-events-none absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
        <AddPostButton onClick={handleAddPostClick} />
      </div>

      <CreatePostModal
        isOpen={isModalOpen}
        form={form}
        error={formError}
        isSubmitting={isSubmitting}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        onClose={handleCloseModal}
        onPickLocation={handlePickLocation}
      />
    </main>
  );
}
