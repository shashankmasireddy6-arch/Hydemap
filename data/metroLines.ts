// Real Hyderabad Metro route geometry and station locations (Red, Blue,
// Green lines), sourced once from OpenStreetMap's Overpass API and
// hardcoded here — see the "Metro lines" section in the README for why
// this exists alongside Google's built-in TransitLayer (Google's own
// transit data for Hyderabad only renders one of the three real lines).
// Fetched once at dev time, not queried live from the app — a live
// per-pan Overpass dependency is exactly what made this app's earlier
// train/bus-stops feature unreliable enough to remove; a static,
// checked-in snapshot has none of that risk. Line paths have their point
// density reduced (Douglas-Peucker, ~30m tolerance) from the raw OSM way
// geometry to keep this file reasonably sized. Colors are plain
// red/blue/green for clear visual distinction, not verified official HMR
// brand hex values.
export interface MetroLine {
  name: string;
  color: string;
  path: google.maps.LatLngLiteral[];
}

export interface MetroStation {
  name: string;
  lat: number;
  lng: number;
}

export const METRO_LINES: MetroLine[] = [
  {
    name: "Blue Line",
    color: "#2563eb",
    path: [{ lat: 17.441297, lng: 78.37718 }, { lat: 17.446284, lng: 78.377452 }, { lat: 17.448545, lng: 78.378969 }, { lat: 17.450483, lng: 78.379611 }, { lat: 17.451081, lng: 78.381414 }, { lat: 17.444054, lng: 78.387068 }, { lat: 17.441609, lng: 78.388292 }, { lat: 17.440854, lng: 78.392967 }, { lat: 17.438739, lng: 78.397536 }, { lat: 17.438728, lng: 78.39931 }, { lat: 17.435705, lng: 78.401495 }, { lat: 17.432939, lng: 78.406557 }, { lat: 17.431189, lng: 78.407547 }, { lat: 17.429836, lng: 78.40982 }, { lat: 17.429911, lng: 78.411988 }, { lat: 17.427058, lng: 78.41536 }, { lat: 17.427414, lng: 78.416258 }, { lat: 17.430947, lng: 78.419849 }, { lat: 17.429737, lng: 78.424306 }, { lat: 17.429948, lng: 78.425139 }, { lat: 17.435955, lng: 78.42765 }, { lat: 17.436567, lng: 78.428443 }, { lat: 17.435982, lng: 78.43104 }, { lat: 17.436588, lng: 78.432696 }, { lat: 17.436122, lng: 78.437623 }, { lat: 17.437708, lng: 78.44051 }, { lat: 17.43695, lng: 78.443405 }, { lat: 17.434613, lng: 78.445123 }, { lat: 17.434164, lng: 78.445963 }, { lat: 17.435067, lng: 78.451285 }, { lat: 17.436039, lng: 78.452714 }, { lat: 17.435483, lng: 78.455455 }, { lat: 17.438071, lng: 78.457142 }, { lat: 17.441983, lng: 78.458206 }, { lat: 17.444098, lng: 78.460951 }, { lat: 17.445101, lng: 78.464129 }, { lat: 17.443673, lng: 78.475707 }, { lat: 17.442708, lng: 78.504199 }, { lat: 17.44142, lng: 78.505512 }, { lat: 17.437916, lng: 78.504767 }, { lat: 17.433526, lng: 78.506317 }, { lat: 17.433549, lng: 78.510126 }, { lat: 17.436915, lng: 78.516789 }, { lat: 17.436929, lng: 78.517823 }, { lat: 17.429037, lng: 78.526988 }, { lat: 17.425646, lng: 78.532586 }, { lat: 17.424453, lng: 78.536329 }, { lat: 17.419381, lng: 78.541204 }, { lat: 17.408645, lng: 78.553138 }, { lat: 17.401356, lng: 78.560213 }, { lat: 17.390235, lng: 78.558807 }],
  },
  {
    name: "Red Line",
    color: "#dc2626",
    path: [{ lat: 17.349846, lng: 78.547941 }, { lat: 17.352076, lng: 78.546483 }, { lat: 17.364257, lng: 78.543224 }, { lat: 17.366497, lng: 78.541513 }, { lat: 17.367592, lng: 78.539807 }, { lat: 17.368295, lng: 78.536865 }, { lat: 17.36871, lng: 78.519912 }, { lat: 17.369988, lng: 78.514132 }, { lat: 17.372608, lng: 78.508289 }, { lat: 17.373898, lng: 78.500506 }, { lat: 17.375408, lng: 78.498057 }, { lat: 17.375731, lng: 78.496682 }, { lat: 17.377089, lng: 78.495248 }, { lat: 17.377527, lng: 78.489272 }, { lat: 17.378867, lng: 78.487087 }, { lat: 17.380785, lng: 78.485195 }, { lat: 17.382859, lng: 78.48008 }, { lat: 17.383394, lng: 78.47618 }, { lat: 17.383987, lng: 78.474898 }, { lat: 17.390262, lng: 78.470185 }, { lat: 17.394574, lng: 78.470427 }, { lat: 17.396374, lng: 78.471105 }, { lat: 17.400901, lng: 78.470403 }, { lat: 17.402675, lng: 78.467822 }, { lat: 17.402985, lng: 78.466052 }, { lat: 17.40635, lng: 78.462769 }, { lat: 17.407272, lng: 78.460655 }, { lat: 17.412245, lng: 78.460757 }, { lat: 17.414294, lng: 78.458766 }, { lat: 17.41614, lng: 78.4577 }, { lat: 17.419271, lng: 78.456964 }, { lat: 17.429519, lng: 78.450562 }, { lat: 17.433682, lng: 78.446011 }, { lat: 17.437169, lng: 78.443729 }, { lat: 17.460344, lng: 78.431792 }, { lat: 17.468922, lng: 78.428126 }, { lat: 17.475752, lng: 78.423446 }, { lat: 17.483836, lng: 78.412659 }, { lat: 17.491311, lng: 78.406959 }, { lat: 17.495693, lng: 78.397661 }, { lat: 17.496756, lng: 78.393927 }, { lat: 17.498361, lng: 78.390998 }, { lat: 17.499474, lng: 78.38279 }, { lat: 17.497279, lng: 78.377072 }, { lat: 17.496555, lng: 78.373025 }],
  },
  {
    name: "Green Line",
    color: "#16a34a",
    path: [{ lat: 17.374733, lng: 78.483691 }, { lat: 17.378494, lng: 78.486321 }, { lat: 17.380654, lng: 78.485186 }, { lat: 17.381682, lng: 78.482852 }, { lat: 17.382838, lng: 78.482641 }, { lat: 17.390096, lng: 78.488789 }, { lat: 17.395334, lng: 78.490303 }, { lat: 17.399454, lng: 78.494724 }, { lat: 17.404066, lng: 78.495526 }, { lat: 17.409651, lng: 78.497803 }, { lat: 17.414006, lng: 78.497696 }, { lat: 17.422523, lng: 78.501621 }, { lat: 17.429056, lng: 78.502261 }, { lat: 17.430333, lng: 78.50108 }, { lat: 17.430751, lng: 78.49959 }, { lat: 17.432096, lng: 78.497995 }, { lat: 17.433068, lng: 78.498199 }, { lat: 17.434393, lng: 78.500329 }, { lat: 17.435406, lng: 78.500603 }, { lat: 17.439527, lng: 78.498963 }, { lat: 17.443415, lng: 78.498408 }, { lat: 17.446001, lng: 78.496266 }, { lat: 17.448822, lng: 78.496441 }],
  },
];

// Station stop nodes from the same three route relations, resolved to
// their names via a second Overpass query (route-relation members only
// carry a node ref + role, not tags) and deduplicated where an
// interchange (Mahatma Gandhi Bus Station, Parade Grounds) had a
// separate node per line — merged to one entry with averaged
// coordinates rather than two overlapping markers.
export const METRO_STATIONS: MetroStation[] = [
  { name: "Ameerpet", lat: 17.4355, lng: 78.444734 },
  { name: "Assembly", lat: 17.397991, lng: 78.47088 },
  { name: "Balanagar", lat: 17.47676, lng: 78.422101 },
  { name: "Begumpet", lat: 17.437584, lng: 78.456906 },
  { name: "Bharat Nagar", lat: 17.464041, lng: 78.430093 },
  { name: "Chaitanyapuri", lat: 17.36831, lng: 78.536191 },
  { name: "Chikkadpally", lat: 17.400368, lng: 78.494874 },
  { name: "Dilsukh Nagar", lat: 17.368563, lng: 78.525718 },
  { name: "Durgam Cheruvu", lat: 17.442916, lng: 78.387592 },
  { name: "ESI Hospital", lat: 17.447016, lng: 78.438567 },
  { name: "Erragadda", lat: 17.457072, lng: 78.433594 },
  { name: "Gandhi Bhavan", lat: 17.385825, lng: 78.473335 },
  { name: "Gandhi Hospital", lat: 17.425522, lng: 78.501882 },
  { name: "HITEC City", lat: 17.449013, lng: 78.383156 },
  { name: "Habsiguda", lat: 17.420195, lng: 78.540572 },
  { name: "Irrum Manzil", lat: 17.420229, lng: 78.456349 },
  { name: "JNTU College", lat: 17.498672, lng: 78.388868 },
  { name: "Jubilee Hills Checkpost", lat: 17.428235, lng: 78.413705 },
  { name: "KPHB Colony", lat: 17.493819, lng: 78.401776 },
  { name: "Khairatabad", lat: 17.411161, lng: 78.460953 },
  { name: "Kukatpally", lat: 17.48493, lng: 78.411778 },
  { name: "L. B. Nagar", lat: 17.349846, lng: 78.547941 },
  { name: "Lakdi-ka-pul", lat: 17.40364, lng: 78.46532 },
  { name: "Madhapur", lat: 17.437269, lng: 78.400442 },
  { name: "Madhura Nagar", lat: 17.436978, lng: 78.439087 },
  { name: "Mahatma Gandhi Bus Station", lat: 17.379702, lng: 78.486017 },
  { name: "Malakpet", lat: 17.377205, lng: 78.493904 },
  { name: "Mettuguda", lat: 17.435544, lng: 78.519596 },
  { name: "Miyapur", lat: 17.496555, lng: 78.373025 },
  { name: "Moosapet", lat: 17.471885, lng: 78.426118 },
  { name: "Musarambagh", lat: 17.371087, lng: 78.511955 },
  { name: "Musheerabad", lat: 17.417888, lng: 78.499471 },
  { name: "NGRI", lat: 17.414846, lng: 78.546353 },
  { name: "Nagole", lat: 17.390544, lng: 78.558827 },
  { name: "Nampally", lat: 17.392222, lng: 78.470161 },
  { name: "Narayanaguda", lat: 17.394371, lng: 78.489939 },
  { name: "New Market", lat: 17.373445, lng: 78.503179 },
  { name: "Osmania Medical College", lat: 17.38212, lng: 78.481615 },
  { name: "Panjagutta", lat: 17.428446, lng: 78.451309 },
  { name: "Parade Grounds", lat: 17.443836, lng: 78.497512 },
  { name: "Paradise", lat: 17.443491, lng: 78.486246 },
  { name: "Peddamma Gudi", lat: 17.430668, lng: 78.408383 },
  { name: "Prakash Nagar", lat: 17.444904, lng: 78.465879 },
  { name: "RTC Cross Roads", lat: 17.407045, lng: 78.496772 },
  { name: "Raidurg", lat: 17.442182, lng: 78.377164 },
  { name: "Rasoolpura", lat: 17.443638, lng: 78.47641 },
  { name: "Road No 5 Jubilee Hills", lat: 17.43007, lng: 78.423214 },
  { name: "S. R. Nagar", lat: 17.441713, lng: 78.441626 },
  { name: "Secunderabad East", lat: 17.435726, lng: 78.505489 },
  { name: "Secunderabad West", lat: 17.433834, lng: 78.499501 },
  { name: "Stadium", lat: 17.407415, lng: 78.554273 },
  { name: "Sultan Bazar", lat: 17.384465, lng: 78.484 },
  { name: "Tarnaka", lat: 17.428319, lng: 78.528458 },
  { name: "Uppal", lat: 17.40006, lng: 78.560246 },
  { name: "Victoria Memorial", lat: 17.361856, lng: 78.543962 },
  { name: "Yusufguda", lat: 17.435116, lng: 78.427301 },
];
