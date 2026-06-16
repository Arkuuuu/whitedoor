export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("wd_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("wd_session_id", sid);
  }
  return sid;
}
