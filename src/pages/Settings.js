/* eslint-disable */
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
import { HexColorPicker } from "react-colorful";
import { firestore } from "../helpers/firebaseConfig";
import { useTranslation } from "react-i18next";
import { useHideMenu } from "../hooks/useHideMenu";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  Timestamp,
} from "firebase/firestore";

// Import the LocationPicker component
import { LocationPicker } from "../components/LocationPicker";

const { Title, Text } = Typography;

export const Settings = () => {
  const [t] = useTranslation("global");
  const [stations, setStations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState({});

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

  useEffect(() => {
    const usersRef = collection(firestore, "users");

    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const userData = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unknown",
        email: doc.data().email || "Unknown",
        permissions:
          typeof doc.data().permissions === "object" &&
          doc.data().permissions !== null
            ? doc.data().permissions
            : {}, // Ensure it's an object (map)
      }));
      setUsers(userData);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  useEffect(() => {
    const extractPermissionKeys = (usersData) => {
      const allKeys = new Set();
      usersData.forEach((user) => {
        Object.keys(user.permissions).forEach((key) => allKeys.add(key));
      });
      setPermissionKeys(Array.from(allKeys).sort()); // Sort alphabetically
    };
    extractPermissionKeys(users);
  }, [users]);

  const handlePermissionChange = async (userId, permissionKey, newValue) => {
    try {
      const userRef = doc(firestore, "users", userId);
      const updatedTimestamp = Timestamp.now(); // Capture timestamp once

      await updateDoc(userRef, {
        [`permissions.${permissionKey}`]: newValue,
        updated: updatedTimestamp, // Update specific field
      });

      console.log(
        `Updated ${permissionKey} to ${newValue} for user ${userId} at ${updatedTimestamp}.`
      );
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                permissions: {
                  ...user.permissions,
                  [permissionKey]: newValue,
                },
                updated: updatedTimestamp,
              }
            : user
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

          ...(Array.isArray(permissionKeys) ? permissionKeys : []).map(
            (key) => ({
              title: key,
              dataIndex: "permissions",
              key: key,
              render: (_, record) => {
                try {
                  // Convert array of objects into a lookup object
                  const permissionsMap =
                    typeof record.permissions === "object" &&
                    record.permissions !== null
                      ? { ...record.permissions } // Ensure it's copied properly
                      : {};
                  return (
                    <Switch
                      checked={permissionsMap[key] || false}
                      onChange={(checked) =>
                        handlePermissionChange(record.id, key, checked)
                      }
                    />
                  );
                } catch (innerError) {
                  console.error("Error inside render function:", innerError);
                  return <span>Error</span>; // Prevent crash
                }
              },
            })
          ),
        ]}
      />
    </div>
  );
};
