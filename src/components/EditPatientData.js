
/* eslint-disable */


import React from 'react';
import { Form, Input, Button, Row, Col } from 'antd';
import { useTranslation } from "react-i18next";
import { updatePatientData } from "../helpers/updatePatientData";

const EditPatientData = ({ initialValues, onSave }) => {
    const { paciente, tel, motivo, pt_no } = initialValues;
    const [form] = Form.useForm();
    const [t] = useTranslation("global");

    const onFinish = (values) => {
        const { paciente, tel, motivo} = values;
        updatePatientData(paciente, tel, motivo, pt_no);
        onSave(); // Trigger the save callback provided by the parent component
    };
    
    return (
        <Form
            form={form}
            name="editPatient"
            initialValues={initialValues}
            onFinish={onFinish}
        >
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={24}>
                    <Form.Item
                        label={t("name")}
                        name="paciente"
                        rules={[{ required: true, message: t("name") }]}
                    >
                        <Input />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={24}>
                    <Form.Item
                        label={t("tel")}
                        name="tel"
                        rules={[
                            {
                                validator: (_, value) => {
                                    if (value === undefined || value === "") {
                                        return Promise.resolve();
                                    }
                                    if (
                                        /^(\+\d{1,3}[-  *])?\(?([0-9]{3,4})\)?[-.●  *]?([0-9]{3,4})[-.●  *]?([0-9]{3,4})?$/.test(
                                            value
                                        )
                                    ) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(t("enterValidPhoneNumber")));
                                },
                            },
                        ]}
                    >
                        <Input type="tel" />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={24}>
                    <Form.Item
                        label={t("reasonForVisit")}
                        name="motivo"
                        rules={[{ required: true, message: t("reasonForVisit") }]}
                    >
                        <Input />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={24}>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            shape="round"
                            name="save"
                        >
                            {t("SAVE")}
                        </Button>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default EditPatientData;
