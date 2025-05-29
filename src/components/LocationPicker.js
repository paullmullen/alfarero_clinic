import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PropTypes from "prop-types";

// Ensure default Leaflet icons are loaded correctly
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const DEFAULT_LOCATION = { lat: 14.6232421, lng: -90.5304184 };

const LocationPicker = ({ currentLocation, onLocationSelect }) => {
  const initialPosition = currentLocation || DEFAULT_LOCATION;
  const [position, setPosition] = useState(initialPosition);
  const [hovering, setHovering] = useState(false);
  const markerRef = useRef(null);

  const MapEvents = () => {
    useMapEvents({
      mouseover: () => setHovering(true),
      mouseout: () => setHovering(false),
      click: (e) => {
        const { lat, lng } = e.latlng;
        setPosition({ lat, lng });
        if (hovering) {
          onLocationSelect(lat, lng);
        }
      },
    });
    return null;
  };

  return (
    <MapContainer
      center={position}
      zoom={15}
      style={{ height: "300px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={position} draggable ref={markerRef} />
      <MapEvents />
    </MapContainer>
  );
};

LocationPicker.propTypes = {
  currentLocation: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
  }),
  onLocationSelect: PropTypes.func.isRequired,
};

export default LocationPicker;
