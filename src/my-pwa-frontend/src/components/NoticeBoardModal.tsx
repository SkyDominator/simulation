import React, { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { api } from "../services/api";
import type { Notice } from "../types/types";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeNotice ? "공지사항" : "공지사항"}
      size="auto"
      variant="info"
    >
      <div className="flex flex-col sm:flex-row gap-4 h-full">
        <div className="sm:w-64 flex-shrink-0 border rounded-lg overflow-hidden bg-white/50">
          <div className="border-b px-3 py-2 text-xs font-semibold text-gray-500 tracking-wide uppercase bg-gray-50">
            목록
          </div>
          <ul className="max-h-[55vh] overflow-y-auto divide-y">
            {loading && (
              <li className="p-3 text-sm text-gray-500">로딩 중...</li>
            )}
            {error && <li className="p-3 text-sm text-red-500">{error}</li>}
            {!loading && !error && notices.length === 0 && (
              <li className="p-4 text-xs text-gray-400">
                등록된 공지가 없습니다.
              </li>
            )}
            {notices.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => selectNotice(n)}
                  className={`flex w-full text-left px-3 py-3 gap-2 group transition border-l-2 ${
                    activeNotice?.id === n.id
                      ? "bg-blue-50/60 border-blue-500"
                      : "border-transparent hover:bg-gray-50"
                  } `}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-medium truncate text-gray-800 group-hover:text-gray-900">
                      {n.title}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-0.5">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  {n.pinned && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                      PIN
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 min-w-0 relative">
          {activeNotice ? (
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <header className="mb-4 border-b pb-3">
                <h1 className="text-lg font-semibold leading-tight text-gray-900 flex items-center gap-2 flex-wrap">
                  {activeNotice.pinned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                      PIN
                    </span>
                  )}
                  <span>{activeNotice.title}</span>
                </h1>
                <p className="text-[11px] text-gray-400 mt-1">
                  {activeNotice.created_at
                    ? new Date(activeNotice.created_at).toLocaleString()
                    : ""}
                </p>
              </header>
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {activeNotice.content}
              </div>
            </article>
          ) : (
            <div className="h-full grid place-items-center text-sm text-gray-400">
              공지를 선택하세요.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NoticeBoardModal;
