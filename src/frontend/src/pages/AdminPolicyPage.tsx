import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Paper,
  Divider,
  Alert,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import { api } from "../services/api";
import type { Page } from "../types/types";
import { useAuth } from "../context/useAuth";

interface AdminPolicyPageProps {
  setPage: (page: Page) => void;
}

const AdminPolicyPage: React.FC<AdminPolicyPageProps> = ({ setPage }) => {
  const { session } = useAuth();
  const token = session?.access_token || "";

  const [version, setVersion] = useState("");
  const [locale, setLocale] = useState("ko-KR");
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [content, setContent] = useState<string>(
    "# 개인정보처리방침\n\n여기에 내용을 작성하세요."
  );
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const canSave = useMemo(
    () => version.trim().length > 0 && content.trim().length > 0,
    [version, content]
  );

  useEffect(() => {
    setError("");
    setMessage("");
  }, [version, locale, effectiveDate, lastUpdated, content]);

  // Determine admin privileges (admins get full editor; non-admins see read-only latest published policy)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setIsAdmin(false);
      return;
    }
    api
      .adminMe(token)
      .then((res) => {
        if (!cancelled) setIsAdmin(!!res.is_admin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // For non-admins: fetch the latest published privacy policy (read-only)
  const [publicPolicy, setPublicPolicy] = useState<{
    version: string;
    last_updated?: string;
    content: string;
  } | null>(null);
  const [publicLoading, setPublicLoading] = useState<boolean>(true);
  const [publicError, setPublicError] = useState<string>("");
  useEffect(() => {
    if (isAdmin) return; // admins use the editor flow
    let cancelled = false;
    setPublicLoading(true);
    setPublicError("");
    api
      .getPrivacyPolicy()
      .then((res) => {
        if (cancelled) return;
        setPublicPolicy({
          version: res.version,
          last_updated: res.last_updated,
          content: res.content,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPublicError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setPublicLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const createOrUpdate = async () => {
    if (!token) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");
      if (!policyId) {
        const resp = await api.createPrivacyPolicy(token, {
          version: version.trim(),
          content,
          locale: locale.trim() || "ko-KR",
          published: false,
          effective_date: effectiveDate || undefined,
          last_updated: lastUpdated || undefined,
        });
        setPolicyId(resp.id);
        setMessage("정책이 생성되었습니다.");
      } else {
        await api.updatePrivacyPolicy(token, policyId, {
          version: version.trim(),
          content,
          locale: locale.trim() || "ko-KR",
          effective_date: effectiveDate || undefined,
          last_updated: lastUpdated || undefined,
        });
        setMessage("정책이 업데이트되었습니다.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!token || !policyId) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await api.publishPrivacyPolicy(token, policyId);
      setMessage("정책이 게시되었습니다.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // Non-admin read-only rendering
  if (!isAdmin) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1000, mx: "auto" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" fontWeight={700}>
            개인정보처리방침
          </Typography>
          <Button variant="text" onClick={() => setPage("main")}>
            돌아가기
          </Button>
        </Stack>

        <Paper sx={{ p: 2 }}>
          {publicError && <Alert severity="error">{publicError}</Alert>}
          {publicLoading ? (
            <Typography color="text.secondary">불러오는 중...</Typography>
          ) : publicPolicy ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                버전 {publicPolicy.version}
                {publicPolicy.last_updated
                  ? ` · 업데이트: ${new Date(
                      publicPolicy.last_updated
                    ).toLocaleDateString()}`
                  : ""}
              </Typography>
              <Divider />
              <Box
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                }}
              >
                <ReactMarkdown>{publicPolicy.content}</ReactMarkdown>
              </Box>
            </Stack>
          ) : (
            <Alert severity="info">게시된 개인정보처리방침이 없습니다.</Alert>
          )}
        </Paper>
      </Box>
    );
  }

  // Admin full editor rendering
  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1000, mx: "auto" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6" fontWeight={700}>
          개인정보처리방침 관리
        </Typography>
        <Button variant="text" onClick={() => setPage("main")}>
          돌아가기
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="버전"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              fullWidth
            />
            <TextField
              label="로케일"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="시행일(YYYY-MM-DD)"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              fullWidth
            />
            <TextField
              label="업데이트일(YYYY-MM-DD)"
              value={lastUpdated}
              onChange={(e) => setLastUpdated(e.target.value)}
              fullWidth
            />
          </Stack>

          <Divider />

          <Stack direction="row" spacing={1}>
            <Button
              variant={preview ? "outlined" : "contained"}
              onClick={() => setPreview(false)}
            >
              편집
            </Button>
            <Button
              variant={preview ? "contained" : "outlined"}
              onClick={() => setPreview(true)}
            >
              미리보기
            </Button>
          </Stack>

          {!preview ? (
            <TextField
              label="정책 내용 (Markdown)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              minRows={12}
              fullWidth
              multiline
            />
          ) : (
            <Box
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              <ReactMarkdown>{content}</ReactMarkdown>
            </Box>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              onClick={createOrUpdate}
              variant="contained"
              disabled={!canSave || busy}
            >
              {policyId ? "수정 저장" : "새로 만들기"}
            </Button>
            <Button
              onClick={publish}
              variant="outlined"
              color="success"
              disabled={!policyId || busy}
            >
              게시
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default AdminPolicyPage;
