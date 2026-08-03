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
import MapControls from "@/components/MapControls";
import AdminAuth from "@/components/AdminAuth";
import Toast from "@/components/Toast";
import { LatLng, PostType, Property } from "@/types/post";
import { filterProperties } from "@/lib/filterProperties";
import { calculateNearbyAverageRent, calculateRentPaidRange } from "@/lib/rentInsights";
import { useMapCenter } from "@/lib/useMapCenter";
import { useAuth } from "@/lib/useAuth";
import {
  buildPropertyFromForm,
  CreatePostFormState,
  DEFAULT_CREATE_POST_FORM,
} from "@/lib/createPostForm";
import { fetchPosts, addPost, uploadPostPhotos, softDeletePost } from "@/lib/postsService";
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
  // Debounced on pan/zoom — drives the "nearby" average-rent radius below.
  const mapCenter = useMapCenter(map);

  const { isAdmin } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss whatever toast is currently showing.
  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

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

  // Average rent within 3km of the map's current center (see
  // lib/rentInsights.ts) — still respects the active type/budget filters
  // (filteredProperties), the distance check is on top of those, not
  // instead of them. Recomputes as the map pans (mapCenter) or filters
  // change.
  const averageRent = useMemo(
    () => calculateNearbyAverageRent(mapCenter, filteredProperties),
    [mapCenter, filteredProperties]
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

  // Admin-only (see MapView's isAdmin prop) — soft-deletes a post after
  // confirmation. The actual permission check happens in Firestore
  // security rules (firestore.rules), not here; this just calls the
  // update and reflects the result locally.
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await softDeletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setToastMessage("Post deleted.");
    } catch (err) {
      console.error("Failed to delete post:", err);
      setToastMessage("Couldn't delete the post. Try again.");
    }
  };

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
        // Demo-mode posts aren't real Firestore documents, so softDeletePost
        // would just fail against them — hide the button rather than offer
        // a delete that can't work.
        isAdmin={isAdmin && !usingDemoData}
        onDeletePost={handleDeletePost}
      />

      {/* Map controls: metro lines, train stations, bus stops, satellite toggle — top right */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
        <MapControls map={map} />
      </div>

      {/* Admin sign-in, top left */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 sm:left-4 sm:top-4">
        <AdminAuth />
      </div>

      {/* Top area: search + filter bar side by side, results count, insights, location badge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-3 sm:p-4">
        <div className="flex w-full max-w-md flex-col items-stretch gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:items-start">
          {!isPickingLocation && <SearchBar map={map} />}
          {!isLoading && !isPickingLocation && (
            <FilterBar
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              budget={budget}
              onBudgetChange={setBudget}
              budgetLimits={BUDGET_LIMITS}
            />
          )}
        </div>
        {isLoading ? (
          <div className="pointer-events-auto rounded-full border border-slate-100 bg-white/95 px-4 py-1.5 text-xs font-medium text-slate-500 shadow-panel backdrop-blur-md">
            Loading posts…
          </div>
        ) : (
          <>
            <ResultsCount visible={filteredProperties.length} total={posts.length} />
            {isPickingLocation && <PickLocationBanner onCancel={handleCancelPicking} />}
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

      <Toast message={toastMessage} />
    </main>
  );
}
