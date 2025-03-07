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
  Switch,
  Table,
} from "antd";
import { HexColorPicker } from "react-colorful"; // Updated import
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

// Import the LocationPicker component
import { LocationPicker } from "../components/LocationPicker";

const { Title, Text } = Typography;

export const Settings = () => {
  const [t] = useTranslation("global");
  const [stations, setStations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);

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

    const fetchUsers = async () => {
      try {
        const usersRef = collection(firestore, "users");
        const snapshot = await getDocs(usersRef);
        const userData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown",
          email: doc.data().email || "unknown",
          admin: doc.data().admin || false,
          can_edit: doc.data().can_edit || false,
        }));
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
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
    fetchUsers();
  }, []);

  const handlePermissionChange = async (userId, key, value) => {
    try {
      const userDocRef = doc(firestore, "users", userId);
      await updateDoc(userDocRef, { [key]: value });
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, [key]: value } : user
        )
      );
    } catch (error) {
      console.error("Error updating permissions:", error);
    }
  };

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

  const handleMaxTimeUpdate = async (stationId, value) => {
    try {
      const maxTimeDocReference = doc(firestore, "stats", stationId);
      await updateDoc(maxTimeDocReference, { max_waiting_time: value });
      console.log(`Updated waitingtime for:`, stationId);
    } catch (error) {
      console.error(`Error updating waiting_time:`, error);
    }
  };

  const handleAddLocation = async () => {
    try {
      const newLocation = {
        name: "New Location",
        background_color: "#ffffff",
        stations: [],
        latitude: 14.6232421,
        longitude: -90.5304184,
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
        <Row key={station.id} align="middle" style={{ marginBottom: "16px" }}>
          <Col span={6}>&nbsp;</Col>
          <Col span={3}>
            <Text style={{ fontSize: "16px" }}>{station.name}</Text>
          </Col>
          <Col span={4}>
            <InputNumber
              style={{ width: "50%", textAlign: "right" }}
              value={station.max_waiting_time}
              onChange={(value) => handleMaxTimeUpdate(station.id, value)}
              min={0}
            />
          </Col>
          <Col span={8}>{(station.max_waiting_time / 60).toFixed(1)} min</Col>
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
          align="top"
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

          <Col span={12}>
            <LocationPicker
              currentLocation={{
                lat: location.latitude,
                lng: location.longitude,
              }}
              onLocationSelect={(lat, lng) => {
                console.log("boom");
                handleLocationUpdate(location.id, "latitude", lat);
                handleLocationUpdate(location.id, "longitude", lng);
              }}
            />
          </Col>

          <Col span={24}>
            <div>
              <br></br>
            </div>
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
        </Row>
      ))}
      <Button
        type="primary"
        onClick={handleAddLocation}
        style={{ marginTop: "16px" }}
      >
        {t("ADD_LOCATION")}
      </Button>
      <Divider orientation="left">
        <Title level={2}>{t("USER_PERMISSIONS")}</Title>
      </Divider>
      <Table
        dataSource={users}
        rowKey="id"
        columns={[
          {
            title: t("NAME"),
            dataIndex: "name",
            key: "name",
          },
          {
            title: t("EMAIL"),
            dataIndex: "email",
            key: "email",
          },

          {
            title: t("ADMIN"),
            dataIndex: "admin",
            key: "admin",
            render: (text, record) => (
              <Switch
                checked={record.admin}
                onChange={(checked) =>
                  handlePermissionChange(record.id, "admin", checked)
                }
              />
            ),
          },
          {
            title: t("CAN_EDIT"),
            dataIndex: "can_edit",
            key: "can_edit",
            render: (text, record) => (
              <Switch
                checked={record.can_edit}
                onChange={(checked) =>
                  handlePermissionChange(record.id, "can_edit", checked)
                }
              />
            ),
          },
        ]}
      />
    </div>
  );
};
