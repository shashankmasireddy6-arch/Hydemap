"use client";

import { useEffect, useState } from "react";
import { POST_TYPE_CONFIG } from "@/types/post";
import { CreatePostFormState } from "@/lib/createPostForm";
import { ChevronDownIcon, CloseIcon, MapPinIcon } from "@/components/icons";

interface CreatePostModalProps {
  isOpen: boolean;
  form: CreatePostFormState;
  error?: string;
  isSubmitting?: boolean;
  onChange: (patch: Partial<CreatePostFormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onPickLocation: () => void;
}

// Matches the transition duration classes below, so the component stays
// mounted just long enough to play the exit animation before unmounting.
const TRANSITION_MS = 200;

const inputClasses =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

const labelClasses = "text-xs font-medium text-slate-500";

export default function CreatePostModal({
  isOpen,
  form,
  error,
  isSubmitting = false,
  onChange,
  onSubmit,
  onClose,
  onPickLocation,
}: CreatePostModalProps) {
  // Two-state animation pattern: `shouldRender` keeps the modal mounted
  // during the exit transition; `isVisible` toggles the actual enter/exit
  // classes a frame after mount so the transition has something to animate
  // from.
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timeout = setTimeout(() => setShouldRender(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  if (!shouldRender) return null;

  const hasLocation = form.latitude.trim() !== "" && form.longitude.trim() !== "";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-panel transition-all duration-200 ease-out ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Create Post</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <form
          id="create-post-form"
          onSubmit={onSubmit}
          className="flex flex-col gap-4 overflow-y-auto px-6 py-5"
        >
          {/* Post type */}
          <div className="flex flex-col gap-1">
            <label htmlFor="type" className={labelClasses}>
              Post type
            </label>
            <div className="relative">
              <select
                id="type"
                value={form.type}
                onChange={(e) => onChange({ type: e.target.value as CreatePostFormState["type"] })}
                className={`${inputClasses} appearance-none pr-8`}
              >
                {POST_TYPE_CONFIG.map((config) => (
                  <option key={config.label} value={config.label}>
                    {config.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className={labelClasses}>
              Title
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="e.g. 2BHK near Gachibowli"
              className={inputClasses}
            />
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1">
            <label htmlFor="price" className={labelClasses}>
              Price
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                ₹
              </span>
              <input
                id="price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => onChange({ price: e.target.value })}
                placeholder="18000"
                className={`${inputClasses} pl-7`}
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-1.5 ${labelClasses}`}>
                <MapPinIcon className="h-3.5 w-3.5 text-indigo-600" />
                Location
              </span>
              <button
                type="button"
                onClick={onPickLocation}
                disabled={isSubmitting}
                className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50"
              >
                {hasLocation ? "Re-pick on map" : "Pick on map"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => onChange({ latitude: e.target.value })}
                placeholder="Latitude"
                className={`${inputClasses} bg-white`}
              />
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => onChange({ longitude: e.target.value })}
                placeholder="Longitude"
                className={`${inputClasses} bg-white`}
              />
            </div>
          </div>

          {/* Expiry duration */}
          <div className="flex flex-col gap-1">
            <label htmlFor="duration" className={labelClasses}>
              Active for
            </label>
            <div className="relative">
              <select
                id="duration"
                value={form.duration}
                onChange={(e) =>
                  onChange({ duration: Number(e.target.value) as CreatePostFormState["duration"] })
                }
                className={`${inputClasses} appearance-none pr-8`}
              >
                <option value={7}>7 days</option>
                <option value={15}>15 days</option>
                <option value={30}>30 days</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Flat details — required */}
          <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3">
            <span className={labelClasses}>Flat details</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="bhk" className={labelClasses}>
                  BHK
                </label>
                <div className="relative">
                  <select
                    id="bhk"
                    value={form.bhk}
                    onChange={(e) => onChange({ bhk: e.target.value as CreatePostFormState["bhk"] })}
                    className={`${inputClasses} appearance-none bg-white pr-8`}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5+">5+</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="monthlyRent" className={labelClasses}>
                  Monthly rent
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    ₹
                  </span>
                  <input
                    id="monthlyRent"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.monthlyRent}
                    onChange={(e) =>
                      onChange({ monthlyRent: e.target.value.replace(/[^0-9]/g, "") })
                    }
                    placeholder="18000"
                    className={`${inputClasses} bg-white pl-7`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="furnishing" className={labelClasses}>
                  Furnishing
                </label>
                <div className="relative">
                  <select
                    id="furnishing"
                    value={form.furnishing}
                    onChange={(e) =>
                      onChange({ furnishing: e.target.value as CreatePostFormState["furnishing"] })
                    }
                    className={`${inputClasses} appearance-none bg-white pr-8`}
                  >
                    <option value="Furnished">Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="gatedSociety" className={labelClasses}>
                  Gated society
                </label>
                <div className="relative">
                  <select
                    id="gatedSociety"
                    value={form.gatedSociety}
                    onChange={(e) =>
                      onChange({ gatedSociety: e.target.value as CreatePostFormState["gatedSociety"] })
                    }
                    className={`${inputClasses} appearance-none bg-white pr-8`}
                  >
                    <option value="Gated">Gated</option>
                    <option value="Not Gated">Not Gated</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Flat details — optional */}
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 p-3">
            <span className={labelClasses}>Optional details</span>

            <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
              Maintenance included
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={form.maintenanceIncluded}
                  onChange={(e) => onChange({ maintenanceIncluded: e.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-slate-200 transition peer-checked:bg-indigo-600" />
                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="occupants" className={labelClasses}>
                  Occupants
                </label>
                <div className="relative">
                  <select
                    id="occupants"
                    value={form.occupants}
                    onChange={(e) =>
                      onChange({ occupants: e.target.value as CreatePostFormState["occupants"] })
                    }
                    className={`${inputClasses} appearance-none pr-8`}
                  >
                    <option value="">Not specified</option>
                    <option value="Family">Family</option>
                    <option value="Bachelor">Bachelor</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="pets" className={labelClasses}>
                  Pets
                </label>
                <div className="relative">
                  <select
                    id="pets"
                    value={form.pets}
                    onChange={(e) => onChange({ pets: e.target.value as CreatePostFormState["pets"] })}
                    className={`${inputClasses} appearance-none pr-8`}
                  >
                    <option value="">Not specified</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Not sure">Not sure</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="deposit" className={labelClasses}>
                  Deposit
                </label>
                <input
                  id="deposit"
                  type="number"
                  min={0}
                  value={form.deposit}
                  onChange={(e) => onChange({ deposit: e.target.value })}
                  placeholder="Optional"
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="parking" className={labelClasses}>
                  Parking
                </label>
                <input
                  id="parking"
                  type="number"
                  min={0}
                  value={form.parking}
                  onChange={(e) => onChange({ parking: e.target.value })}
                  className={inputClasses}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="squareFootage" className={labelClasses}>
                  Square footage
                </label>
                <input
                  id="squareFootage"
                  type="number"
                  min={0}
                  value={form.squareFootage}
                  onChange={(e) => onChange({ squareFootage: e.target.value })}
                  placeholder="Optional"
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className={labelClasses}>
                Email <span className="text-slate-400">(kept private, never shown publicly)</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="you@example.com"
                className={inputClasses}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="description" className={labelClasses}>
                Description
              </label>
              <input
                id="description"
                type="text"
                value={form.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="One-line summary"
                className={inputClasses}
              />
            </div>
          </div>

          {/* Extra field: gender preference, Sharing posts only */}
          {form.type === "Sharing" && (
            <div className="flex flex-col gap-1 rounded-xl bg-amber-50 p-3">
              <label htmlFor="gender" className="text-xs font-medium text-amber-700">
                Gender preference
              </label>
              <div className="relative">
                <select
                  id="gender"
                  value={form.genderPreference}
                  onChange={(e) =>
                    onChange({ genderPreference: e.target.value as CreatePostFormState["genderPreference"] })
                  }
                  className={`${inputClasses} appearance-none border-amber-200 bg-white pr-8 focus:border-amber-400 focus:ring-amber-100`}
                >
                  <option value="Any">Any</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
              </div>
            </div>
          )}

          {/* Extra field: anonymous toggle, Rent Paid posts only */}
          {form.type === "Rent Paid" && (
            <label className="flex items-center justify-between gap-2 rounded-xl bg-purple-50 p-3 text-sm text-purple-900">
              Post anonymously
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={form.anonymous}
                  onChange={(e) => onChange({ anonymous: e.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-purple-200 transition peer-checked:bg-purple-600" />
                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </span>
            </label>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </form>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-post-form"
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving…" : "Create post"}
          </button>
        </div>
      </div>
    </div>
  );
}
