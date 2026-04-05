import React, { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  PlusOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useVisitTypes } from "../hooks/useVisitTypes";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const ensureRegIncluded = (plan) => {
  const unique = Array.from(new Set(plan));
  return unique.includes("reg") ? unique : ["reg", ...unique];
};

const VisitTypesManager = ({ stations = [], t }) => {
  const {
    visitTypes,
    loading,
    createVisitType,
    saveField,
    moveVisitType,
    toggleActive,
  } = useVisitTypes();

  const [messageApi, contextHolder] = message.useMessage();

  const [createOpen, setCreateOpen] = useState(false);
  const [newDocId, setNewDocId] = useState("");
  const [newVisitType, setNewVisitType] = useState("");
  const [newName, setNewName] = useState("");
  const [newAliases, setNewAliases] = useState([]);
  const [newPlanOfCare, setNewPlanOfCare] = useState(["reg"]);
  const [creating, setCreating] = useState(false);

  const stationOptions = useMemo(() => {
    return [...stations]
      .sort((a, b) => {
        const aOrder = Number.isFinite(a.order) ? a.order : 999999;
        const bOrder = Number.isFinite(b.order) ? b.order : 999999;
        return aOrder - bOrder;
      })
      .map((station) => ({
        value: station.id,
        label: station.name,
      }));
  }, [stations]);

  const stationLabelMap = useMemo(() => {
    return stationOptions.reduce((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, [stationOptions]);

  const resetCreateForm = () => {
    setNewDocId("");
    setNewVisitType("");
    setNewName("");
    setNewAliases([]);
    setNewPlanOfCare(["reg"]);
  };

  const handleCreate = async () => {
    try {
      setCreating(true);

      await createVisitType({
        id: newDocId,
        visit_type: newVisitType,
        name: newName,
        aliases: newAliases,
        plan_of_care: ensureRegIncluded(newPlanOfCare),
        active: true,
      });

      messageApi.success("Visit type created.");
      resetCreateForm();
      setCreateOpen(false);
    } catch (error) {
      console.error(error);
      messageApi.error(error.message || "Could not create visit type.");
    } finally {
      setCreating(false);
    }
  };

  const handleBlurSave = async (id, field, value) => {
    try {
      await saveField(id, { [field]: value });
      messageApi.success("Saved.");
    } catch (error) {
      console.error(error);
      messageApi.error(error.message || "Save failed.");
    }
  };

  const handleAliasesChange = async (id, aliases) => {
    try {
      await saveField(id, { aliases });
      messageApi.success("Aliases updated.");
    } catch (error) {
      console.error(error);
      messageApi.error(error.message || "Could not update aliases.");
    }
  };

  const handlePlanChange = async (id, nextPlan) => {
    const safePlan = ensureRegIncluded(nextPlan);

    try {
      await saveField(id, { plan_of_care: safePlan });
      messageApi.success("Plan of care updated.");
    } catch (error) {
      console.error(error);
      messageApi.error(error.message || "Could not update plan of care.");
    }
  };

  const movePlanStation = async (item, stationCode, direction) => {
    const current = [...(item.plan_of_care || [])];
    const index = current.findIndex((code) => code === stationCode);

    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const next = [...current];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    await handlePlanChange(item.id, next);
  };

  const removePlanStation = async (item, stationCode) => {
    if (stationCode === "reg") {
      messageApi.warning("reg is required and cannot be removed.");
      return;
    }

    const next = (item.plan_of_care || []).filter(
      (code) => code !== stationCode,
    );
    await handlePlanChange(item.id, next);
  };

  const addPlanStation = async (item, stationCode) => {
    if (!stationCode) return;

    const current = item.plan_of_care || [];
    if (current.includes(stationCode)) return;

    const next = [...current, stationCode];
    await handlePlanChange(item.id, next);
  };

  const orderedVisitTypes = [...visitTypes].sort((a, b) => {
    const aOrder = Number.isFinite(a.order) ? a.order : 999999;
    const bOrder = Number.isFinite(b.order) ? b.order : 999999;
    return aOrder - bOrder;
  });

  const renderPanelHeader = (item, index) => {
    const isInactive = item.active === false;
    const preview = (item.plan_of_care || [])
      .map((code) => stationLabelMap[code] || code)
      .join(" → ");

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          width: "100%",
          paddingRight: 8,
        }}
      >
        <Space wrap size="small" style={{ flex: 1 }}>
          <Text strong>{item.visit_type || item.id}</Text>
          <Tag>{item.name || "—"}</Tag>
          <Tag color={isInactive ? "default" : "green"}>
            {isInactive
              ? t?.("INACTIVE") || "Inactive"
              : t?.("ACTIVE") || "Active"}
          </Tag>
          <Text type="secondary">ID: {item.id}</Text>
          {preview ? <Text type="secondary">• {preview}</Text> : null}
        </Space>

        <Space
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Tooltip title={t?.("MOVE_UP") || "Move up"}>
            <Button
              icon={<ArrowUpOutlined />}
              disabled={index === 0}
              onClick={() => moveVisitType(item.id, "up")}
            />
          </Tooltip>

          <Tooltip title={t?.("MOVE_DOWN") || "Move down"}>
            <Button
              icon={<ArrowDownOutlined />}
              disabled={index === orderedVisitTypes.length - 1}
              onClick={() => moveVisitType(item.id, "down")}
            />
          </Tooltip>

          <Tooltip
            title={
              isInactive
                ? t?.("REACTIVATE") || "Reactivate"
                : t?.("DEACTIVATE") || "Deactivate"
            }
          >
            <Button
              icon={isInactive ? <CheckCircleOutlined /> : <StopOutlined />}
              onClick={() => toggleActive(item.id, isInactive)}
            >
              {isInactive
                ? t?.("REACTIVATE") || "Reactivate"
                : t?.("DEACTIVATE") || "Deactivate"}
            </Button>
          </Tooltip>
        </Space>
      </div>
    );
  };

  return (
    <div>
      {contextHolder}

      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
        align="start"
      >
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            {t?.("VISIT_TYPES") || "Visit Types"}
          </Title>
          <Text type="secondary">
            {t?.("VISIT_TYPES_DESCRIPTION") ||
              "Edit the default plans of care used for common visit reasons."}
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          {t?.("ADD_VISIT_TYPE") || "Add Visit Type"}
        </Button>
      </Space>

      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message={
          t?.("VISIT_TYPES_ALERT") ||
          "These are default recipe-like plans of care. Staff may still change an individual patient's route on the Anfitrión page."
        }
      />

      <Collapse accordion bordered>
        {orderedVisitTypes.map((item, index) => {
          const isInactive = item.active === false;
          const currentPlan = item.plan_of_care || [];

          return (
            <Panel header={renderPanelHeader(item, index)} key={item.id}>
              <Card
                bordered={false}
                loading={loading}
                bodyStyle={{ padding: 0 }}
              >
                <Form layout="vertical">
                  <Form.Item label={t?.("VISIT_TYPE_LABEL") || "Visit Type"}>
                    <Input
                      defaultValue={item.visit_type}
                      onBlur={(e) =>
                        handleBlurSave(
                          item.id,
                          "visit_type",
                          e.target.value.trim(),
                        )
                      }
                      placeholder={t?.("VISIT_TYPE_LABEL") || "Visit Type"}
                    />
                  </Form.Item>

                  <Form.Item label={t?.("SHORT_NAME") || "Short Name"}>
                    <Input
                      defaultValue={item.name}
                      onBlur={(e) =>
                        handleBlurSave(item.id, "name", e.target.value.trim())
                      }
                      placeholder={t?.("SHORT_NAME") || "Short Name"}
                    />
                  </Form.Item>

                  <Form.Item label={t?.("ALIASES") || "Aliases"}>
                    <Select
                      mode="tags"
                      value={item.aliases || []}
                      onChange={(values) =>
                        handleAliasesChange(item.id, values)
                      }
                      tokenSeparators={[","]}
                      style={{ width: "100%" }}
                      placeholder={t?.("ALIASES_PLACEHOLDER") || "Add aliases"}
                      open={false}
                    />
                  </Form.Item>

                  <Form.Item label={t?.("ACTIVE") || "Active"}>
                    <Switch
                      checked={!isInactive}
                      onChange={(checked) => toggleActive(item.id, checked)}
                    />
                  </Form.Item>

                  <Divider style={{ marginTop: 8 }} />

                  <Form.Item
                    label={t?.("PLAN_OF_CARE") || "Plan of Care"}
                    extra={
                      t?.("PLAN_OF_CARE_HELP") ||
                      "Choose from known stations only. Every visit type must include registration."
                    }
                  >
                    <Space
                      direction="vertical"
                      style={{ width: "100%" }}
                      size="small"
                    >
                      {currentPlan.map((stationCode, stationIndex) => {
                        const isReg = stationCode === "reg";
                        const label =
                          stationLabelMap[stationCode] || stationCode;

                        return (
                          <Card
                            key={`${item.id}-${stationCode}`}
                            size="small"
                            bodyStyle={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                              padding: 12,
                            }}
                          >
                            <Space wrap>
                              <Badge
                                count={stationIndex + 1}
                                style={{ backgroundColor: "#999" }}
                              />
                              <Text>{label}</Text>
                              {isReg && <Tag color="blue">Required</Tag>}
                            </Space>

                            <Space>
                              <Button
                                icon={<ArrowUpOutlined />}
                                disabled={stationIndex === 0}
                                onClick={() =>
                                  movePlanStation(item, stationCode, "up")
                                }
                              />
                              <Button
                                icon={<ArrowDownOutlined />}
                                disabled={
                                  stationIndex === currentPlan.length - 1
                                }
                                onClick={() =>
                                  movePlanStation(item, stationCode, "down")
                                }
                              />
                              <Button
                                danger
                                disabled={isReg}
                                onClick={() =>
                                  removePlanStation(item, stationCode)
                                }
                              >
                                {t?.("REMOVE") || "Remove"}
                              </Button>
                            </Space>
                          </Card>
                        );
                      })}

                      <Select
                        placeholder={t?.("ADD_STATION") || "Add station"}
                        style={{ width: "100%" }}
                        value={undefined}
                        onChange={(value) => addPlanStation(item, value)}
                        options={stationOptions.filter(
                          (option) => !currentPlan.includes(option.value),
                        )}
                      />
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </Panel>
          );
        })}
      </Collapse>

      <Modal
        open={createOpen}
        title={t?.("ADD_VISIT_TYPE") || "Add Visit Type"}
        onCancel={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
        onOk={handleCreate}
        confirmLoading={creating}
        okText={t?.("CREATE") || "Create"}
      >
        <Form layout="vertical">
          <Form.Item
            label={t?.("DOCUMENT_ID") || "Document ID"}
            extra={
              t?.("DOCUMENT_ID_HELP") ||
              "This becomes the stable Firestore document ID and is not intended to change later."
            }
          >
            <Input
              value={newDocId}
              onChange={(e) => setNewDocId(e.target.value.trim())}
              placeholder={t?.("DOCUMENT_ID") || "Document ID"}
            />
          </Form.Item>

          <Form.Item label={t?.("VISIT_TYPE_LABEL") || "Visit Type"}>
            <Input
              value={newVisitType}
              onChange={(e) => setNewVisitType(e.target.value)}
              placeholder={t?.("VISIT_TYPE_LABEL") || "Visit Type"}
            />
          </Form.Item>

          <Form.Item label={t?.("SHORT_NAME") || "Short Name"}>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t?.("SHORT_NAME") || "Short Name"}
            />
          </Form.Item>

          <Form.Item label={t?.("ALIASES") || "Aliases"}>
            <Select
              mode="tags"
              value={newAliases}
              onChange={setNewAliases}
              tokenSeparators={[","]}
              style={{ width: "100%" }}
              placeholder={t?.("ALIASES_PLACEHOLDER") || "Add aliases"}
              open={false}
            />
          </Form.Item>

          <Form.Item label={t?.("PLAN_OF_CARE") || "Plan of Care"}>
            <Select
              mode="multiple"
              value={newPlanOfCare}
              onChange={(values) => setNewPlanOfCare(ensureRegIncluded(values))}
              options={stationOptions}
              style={{ width: "100%" }}
              placeholder={t?.("PLAN_OF_CARE") || "Plan of Care"}
            />
          </Form.Item>

          {!newPlanOfCare.includes("reg") && (
            <Alert
              type="warning"
              showIcon
              message="reg will be added automatically because it is required."
            />
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default VisitTypesManager;
