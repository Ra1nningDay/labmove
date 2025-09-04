export type MapStyleKey = "minimal" | "clean" | "dark";

export const mapStyles: Record<MapStyleKey, google.maps.MapTypeStyle[]> = {
  minimal: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
    { featureType: "poi.school", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "simplified" }] },
    { featureType: "landscape", stylers: [{ color: "#f8fafc" }] },
    { featureType: "water", stylers: [{ color: "#dbeafe" }] },
  ],
  clean: [
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "transit.station", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "landscape", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "water", stylers: [{ color: "#c7e0f9" }] },
  ],
  dark: [
    { elementType: "geometry", stylers: [{ color: "#1f2937" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1f2937" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#f3f4f6" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#374151" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "water", stylers: [{ color: "#0f172a" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  ],
};

