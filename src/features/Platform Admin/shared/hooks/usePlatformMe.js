import { useEffect, useState } from "react";
import { fetchPlatformMe, mapPlatformMe } from "../api/platformAuth";
import { shouldEndPlatformSession } from "../api/platformErrors";
import { platformAuth } from "../api/platformSession";
import { usePlatform } from "../context/PlatformContext";

export function usePlatformMe(portal) {
  const { sessionFor, signOutPortal } = usePlatform();
  const session = sessionFor(portal);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchPlatformMe()
      .then((body) => {
        if (cancelled) return;
        setProfile(mapPlatformMe(body, session));
      })
      .catch((err) => {
        if (cancelled) return;
        setProfile(null);
        setError(err?.message || "Your profile could not be loaded.");
        if (shouldEndPlatformSession(err)) signOutPortal(portal);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portal, session, signOutPortal]);

  return {
    profile: profile || (session ? {
      userId: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      photoUrl: session.photoUrl || "",
      createdAt: "",
    } : null),
    live: Boolean(profile),
    error,
    loading,
    session,
  };
}

export function currentPlatformUser() {
  return platformAuth.getUser();
}
