import React, { useEffect, useMemo, useState } from "react";
import { Modal, Typography, Spin, Alert } from "antd";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { getReleaseNotesMarkdown } from "../helpers/releaseNotes";

export default function ReleaseNotesModal({ open, onClose }) {
  const { i18n } = useTranslation();

  const mdUrl = useMemo(() => {
    // NOTE: this returns the imported asset URL string
    return getReleaseNotesMarkdown(i18n.language);
  }, [i18n.language]);

  const [mdText, setMdText] = useState("");
  const [state, setState] = useState({ loading: false, error: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!open) return; // load only when modal is opened
      setState({ loading: true, error: null });

      try {
        // mdUrl is something like "/static/media/releaseNotes.es....md"
        const res = await fetch(mdUrl);
        if (!res.ok)
          throw new Error(`Failed to load release notes (${res.status})`);
        const text = await res.text();
        if (!cancelled) {
          setMdText(text);
          setState({ loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setMdText("");
          setState({
            loading: false,
            error: err?.message || "Failed to load release notes",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, mdUrl]);

  return (
    <Modal
      title="Release Notes"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      <div style={{ maxHeight: "60vh", overflow: "auto" }}>
        {state.loading ? (
          <Spin />
        ) : state.error ? (
          <Alert type="error" message={state.error} />
        ) : (
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <Typography.Title level={3}>{children}</Typography.Title>
              ),
              h2: ({ children }) => (
                <Typography.Title level={4}>{children}</Typography.Title>
              ),
              p: ({ children }) => (
                <Typography.Paragraph>{children}</Typography.Paragraph>
              ),
              li: ({ children }) => (
                <li>
                  <Typography.Text>{children}</Typography.Text>
                </li>
              ),
            }}
          >
            {mdText}
          </ReactMarkdown>
        )}
      </div>
    </Modal>
  );
}
