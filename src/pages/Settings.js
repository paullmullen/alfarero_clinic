import React, { useEffect, useState } from "react";
import {
  Input,
  InputNumber,
  Typography,
  Divider,
  Row,
  Col,
  Select,
  Button,
} from "antd";
import { HexColorPicker } from "react-colorful"; // Import from react-colorful
import { firestore } from "../helpers/firebaseConfig";
import { useTranslation } from "react-i18next";
import { useHideMenu } from "../hooks/useHideMenu";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";

const { Title, Text } = Typography;

export const Settings = () => {
  const [t] = useTranslation("global");
  const [stations, setStations] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const statsRef = collection(firestore, "stats");
        const snapshot = await getDocs(statsRef);
        const stationData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: t(doc.id),
          max_waiting_time: doc.data().max_waiting_time || 0,
          ...doc.data(),
        }));
        setStations(stationData);
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };

    const fetchLocations = async () => {
      try {
        const locationsRef = collection(firestore, "locations");
        const snapshot = await getDocs(locationsRef);
        const locationData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          stations: doc.data().stations || [],
          background_color: doc.data().background_color || "#ffffff",
          latitude: doc.data().latitude || 0,
          longitude: doc.data().longitude || 0,
        }));
        setLocations(locationData);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    fetchStations();
    fetchLocations();
  }, []);

  const handleLocationUpdate = async (locationId, key, value) => {
    try {
      const locationDocRef = doc(firestore, "locations", locationId);
      await updateDoc(locationDocRef, { [key]: value });
      setLocations((prevLocations) =>
        prevLocations.map((loc) =>
          loc.id === locationId ? { ...loc, [key]: value } : loc
        )
      );
      console.log(`Updated ${key} for location:`, locationId);
    } catch (error) {
      console.error(`Error updating ${key} for location:`, error);
    }
  };

  const handleAddLocation = async () => {
    try {
      const newLocation = {
        name: "New Location",
        background_color: "#ffffff",
        stations: [],
        latitude: 0,
        longitude: 0,
      };
      const docRef = await addDoc(
        collection(firestore, "locations"),
        newLocation
      );
      setLocations([...locations, { id: docRef.id, ...newLocation }]);
      console.log("Added new location");
    } catch (error) {
      console.error("Error adding new location:", error);
    }
  };

  useHideMenu(false);

  return (
    <div style={{ padding: "20px" }}>
      <Divider orientation="left">
        <div style={{ textAlign: "left" }}>
          <Title level={2}>{t("MAX_WAIT_TIMES")}</Title>
          <Text>{t("ENTER_WAITING_TIMES")}</Text>
        </div>
      </Divider>

      {stations.map((station) => (
        <Row
          key={station.id}
          align="middle"
          gutter={16}
          style={{ marginBottom: "16px" }}
        >
          <Col span={12}>
            <Text style={{ fontSize: "16px" }}>{station.name}</Text>
          </Col>
          <Col span={12}>
            <InputNumber
              style={{ width: "50%", textAlign: "right" }}
              value={station.max_waiting_time}
              onChange={(value) =>
                handleLocationUpdate(station.id, "max_waiting_time", value)
              }
              min={0}
            />
          </Col>
        </Row>
      ))}

      <Divider orientation="left">
        <div style={{ textAlign: "left" }}>
          <Title level={2}>{t("LOCATIONS")}</Title>
          <Text>{t("MANAGE_LOCATIONS")}</Text>
        </div>
      </Divider>

      {locations.map((location) => (
        <Row
          key={location.id}
          align="middle"
          gutter={16}
          style={{
            marginBottom: "16px",
            backgroundColor: location.background_color,
            padding: "8px",
            borderRadius: "5px",
          }}
        >
          <Col span={4}>
            <Input
              value={location.name}
              onChange={(e) =>
                handleLocationUpdate(location.id, "name", e.target.value)
              }
            />
          </Col>
          <Col span={6}>
            <HexColorPicker
              color={location.background_color}
              onChange={(color) =>
                handleLocationUpdate(location.id, "background_color", color)
              }
            />
          </Col>
          <Col span={6}>
            <Select
              mode="multiple"
              value={location.stations}
              onChange={(stations) =>
                handleLocationUpdate(location.id, "stations", stations)
              }
              style={{ width: "100%" }}
              placeholder={t("ADD_STATIONS")}
              options={stations.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Col>
          <Col span={3}>
            <Text>{t("LATITUDE")}</Text>
            <InputNumber
              value={location.latitude}
              onChange={(value) =>
                handleLocationUpdate(location.id, "latitude", value)
              }
              placeholder="Latitude"
            />
          </Col>
          <Col span={3}>
            <Text>{t("LONGITUDE")}</Text>
            <InputNumber
              value={location.longitude}
              onChange={(value) =>
                handleLocationUpdate(location.id, "longitude", value)
              }
              placeholder="Longitude"
            />
          </Col>
        </Row>
      ))}
      <Button
        type="primary"
        onClick={handleAddLocation}
        style={{ marginTop: "16px" }}
      >
        {t("ADD_LOCATION")}
      </Button>
    </div>
  );
};
