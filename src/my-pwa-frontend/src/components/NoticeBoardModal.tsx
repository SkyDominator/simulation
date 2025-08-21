import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Notice } from "../types/types";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";

interface NoticeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NoticeBoardModal: React.FC<NoticeBoardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    api
      .listNotices()
      .then((res) => {
        setNotices(res.notices);
        if (res.notices.length > 0) setActiveNotice(res.notices[0]);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const selectNotice = (notice: Notice) => setActiveNotice(notice);

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>공지사항</DialogTitle>
      <DialogContent
        dividers
        sx={{ display: "flex", gap: 3, minHeight: { xs: 360, sm: 420 } }}
      >
        <div style={{ width: 260, maxWidth: "40%", flexShrink: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 1.5, pb: 0.5, display: "block" }}
          >
            목록
          </Typography>
          <List dense sx={{ maxHeight: 420, overflowY: "auto" }}>
            {loading && (
              <ListItem>
                <ListItemText primary="로딩 중..." />
              </ListItem>
            )}
            {error && (
              <ListItem>
                <ListItemText
                  primary={error}
                  primaryTypographyProps={{ color: "error" }}
                />
              </ListItem>
            )}
            {!loading && !error && notices.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="등록된 공지가 없습니다."
                  primaryTypographyProps={{
                    variant: "caption",
                    color: "text.secondary",
                  }}
                />
              </ListItem>
            )}
            {notices.map((n) => {
              const selected = activeNotice?.id === n.id;
              return (
                <ListItem key={n.id} disablePadding>
                  <ListItemButton
                    selected={selected}
                    onClick={() => selectNotice(n)}
                    sx={{ alignItems: "flex-start" }}
                  >
                    <ListItemText
                      primary={
                        <span
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          {n.title}
                          {n.pinned && (
                            <Chip
                              size="small"
                              label="PIN"
                              color="warning"
                              sx={{ ml: "auto" }}
                            />
                          )}
                        </span>
                      }
                      secondary={
                        n.created_at
                          ? new Date(n.created_at).toLocaleDateString()
                          : ""
                      }
                      primaryTypographyProps={{
                        fontSize: 13,
                        fontWeight: 500,
                        noWrap: true,
                      }}
                      secondaryTypographyProps={{ fontSize: 11 }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeNotice ? (
            <div>
              <Typography
                variant="h6"
                sx={{ mb: 1, display: "flex", gap: 1, alignItems: "center" }}
              >
                {activeNotice.pinned && (
                  <Chip size="small" label="PIN" color="warning" />
                )}
                <span>{activeNotice.title}</span>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 2 }}
              >
                {activeNotice.created_at
                  ? new Date(activeNotice.created_at).toLocaleString()
                  : ""}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {activeNotice.content}
              </Typography>
            </div>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ height: "100%", display: "grid", placeItems: "center" }}
            >
              공지를 선택하세요.
            </Typography>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoticeBoardModal;
