import React, { useEffect, useMemo, useState } from "react";
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
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import useAuth from "../context/useAuth";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { getJSON, setJSON } from "../utils/persist";

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
  const { session } = useAuth();
  const token = useMemo(() => session?.access_token ?? null, [session]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [formPublished, setFormPublished] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Persist open state
  useEffect(() => {
    setJSON("ui.noticeOpen", isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    api
      .listNotices()
      .then((res) => {
        setNotices(res.notices);
        const savedId = getJSON<string | null>("ui.notice.activeId", null);
        if (savedId) {
          const match = res.notices.find((n) => n.id === savedId);
          if (match) {
            setActiveNotice(match);
            return;
          }
        }
        if (res.notices.length > 0) setActiveNotice(res.notices[0]);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Check admin on open
  useEffect(() => {
    if (!isOpen) return;
    if (!token) {
      setIsAdmin(false);
      return;
    }
    api
      .adminMe(token)
      .then((res) => setIsAdmin(!!res.is_admin))
      .catch(() => setIsAdmin(false));
  }, [isOpen, token]);

  const selectNotice = (notice: Notice) => setActiveNotice(notice);

  useEffect(() => {
    setJSON("ui.notice.activeId", activeNotice?.id ?? null);
  }, [activeNotice?.id]);

  const resetFormFromActive = () => {
    setFormTitle(activeNotice?.title ?? "");
    setFormContent(activeNotice?.content ?? "");
    setFormPinned(!!activeNotice?.pinned);
    setFormPublished(activeNotice?.published !== false);
  };

  const reloadAndSelect = async (selectId?: string) => {
    try {
      setLoading(true);
      const res = await api.listNotices();
      setNotices(res.notices);
      const toPick =
        selectId ||
        activeNotice?.id ||
        getJSON<string | null>("ui.notice.activeId", null);
      const match = res.notices.find((n) => n.id === toPick);
      setActiveNotice(match ?? res.notices[0] ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setAdminError(null);
    setFormTitle("");
    setFormContent("");
    setFormPinned(false);
    setFormPublished(true);
    setMode("create");
  };

  const startEdit = () => {
    setAdminError(null);
    resetFormFromActive();
    setMode("edit");
  };

  const cancelEdit = () => {
    setAdminError(null);
    setMode("view");
  };

  const saveCreate = async () => {
    if (!token) return;
    try {
      setAdminBusy(true);
      const res = await api.createNotice(token, {
        title: formTitle.trim(),
        content: formContent.trim(),
        pinned: formPinned,
        published: formPublished,
      });
      await reloadAndSelect(res.id);
      setMode("view");
    } catch (e) {
      setAdminError(String(e));
    } finally {
      setAdminBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!token || !activeNotice) return;
    try {
      setAdminBusy(true);
      await api.updateNotice(token, activeNotice.id, {
        title: formTitle.trim(),
        content: formContent.trim(),
        pinned: formPinned,
        published: formPublished,
      });
      await reloadAndSelect(activeNotice.id);
      setMode("view");
    } catch (e) {
      setAdminError(String(e));
    } finally {
      setAdminBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!token || !activeNotice) return;
    try {
      setAdminBusy(true);
      await api.deleteNotice(token, activeNotice.id);
      setConfirmOpen(false);
      await reloadAndSelect(undefined);
    } catch (e) {
      setAdminError(String(e));
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>공지사항</span>
        {isAdmin && mode === "view" && (
          <Button size="small" variant="contained" onClick={startCreate}>
            새 공지
          </Button>
        )}
      </DialogTitle>
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
          {mode === "view" && activeNotice && (
            <div>
              <Typography
                variant="h6"
                sx={{ mb: 1, display: "flex", gap: 1, alignItems: "center" }}
              >
                {activeNotice.pinned && (
                  <Chip size="small" label="PIN" color="warning" />
                )}
                <span style={{ flex: 1 }}>{activeNotice.title}</span>
                {isAdmin && (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={startEdit}>
                      수정
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => setConfirmOpen(true)}
                    >
                      삭제
                    </Button>
                  </Stack>
                )}
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
          )}

          {mode !== "view" && (
            <div>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                {mode === "create" ? "새 공지 작성" : "공지 수정"}
              </Typography>
              <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
                {adminError && (
                  <Typography color="error" variant="caption">
                    {adminError}
                  </Typography>
                )}
                <TextField
                  label="제목"
                  size="small"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  inputProps={{ maxLength: 120 }}
                />
                <TextField
                  label="내용"
                  size="small"
                  multiline
                  minRows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
                <Stack direction="row" spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formPinned}
                        onChange={(e) => setFormPinned(e.target.checked)}
                        size="small"
                      />
                    }
                    label="상단 고정"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formPublished}
                        onChange={(e) => setFormPublished(e.target.checked)}
                        size="small"
                      />
                    }
                    label="게시 공개"
                  />
                </Stack>
                <Stack direction="row" spacing={1}>
                  {mode === "create" ? (
                    <Button
                      variant="contained"
                      onClick={saveCreate}
                      disabled={
                        adminBusy || !formTitle.trim() || !formContent.trim()
                      }
                    >
                      작성
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={saveEdit}
                      disabled={
                        adminBusy || !formTitle.trim() || !formContent.trim()
                      }
                    >
                      저장
                    </Button>
                  )}
                  <Button
                    variant="text"
                    onClick={cancelEdit}
                    disabled={adminBusy}
                  >
                    취소
                  </Button>
                </Stack>
              </Stack>
            </div>
          )}

          {mode === "view" && !activeNotice && (
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
      <DeleteConfirmModal
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="공지 삭제"
        message="선택한 공지를 삭제할까요? 이 작업은 되돌릴 수 없습니다."
      />
    </Dialog>
  );
};

export default NoticeBoardModal;
