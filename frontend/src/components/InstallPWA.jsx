import React, { useEffect, useState } from "react";
import { Box, Button, Typography, IconButton } from "@mui/material";
import GetAppIcon from "@mui/icons-material/GetApp";
import CloseIcon from "@mui/icons-material/Close";
import AppleIcon from "@mui/icons-material/Apple";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(localStorage.getItem("pwa_dismissed") === "true");

  useEffect(() => {
    // Detect iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    // Detect if already installed (standalone mode)
    const isStandalone = () => {
      return ('standalone' in window.navigator && window.navigator.standalone) || 
             window.matchMedia('(display-mode: standalone)').matches;
    };

    if (isStandalone() || dismissed) {
      return;
    }

    if (isIos()) {
      setShowIos(true);
    } else {
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowAndroid(true);
      };
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    }
  }, [dismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroid(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_dismissed", "true");
    setDismissed(true);
    setShowAndroid(false);
    setShowIos(false);
  };

  if (!showAndroid && !showIos) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        maxWidth: 400,
        bgcolor: "#1e293b",
        color: "white",
        borderRadius: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        p: 2,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box display="flex" alignItems="center" gap={2} flex={1}>
        {showIos ? <AppleIcon fontSize="large" sx={{ color: "#e2e8f0" }} /> : <GetAppIcon fontSize="large" sx={{ color: "#38bdf8" }} />}
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>Instala la App</Typography>
          {showIos ? (
            <Typography variant="caption" color="#94a3b8">
              Toca <b>Compartir</b> y luego <b>Agregar a inicio</b>.
            </Typography>
          ) : (
            <Typography variant="caption" color="#94a3b8">Acceso rápido y mejor experiencia.</Typography>
          )}
        </Box>
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        {showAndroid && (
          <Button size="small" variant="contained" sx={{ bgcolor: "#38bdf8", color: "#0f172a", '&:hover': { bgcolor: "#0ea5e9" }, textTransform: "none", fontWeight: 700 }} onClick={handleInstallClick}>
            Instalar
          </Button>
        )}
        <IconButton size="small" onClick={handleDismiss} sx={{ color: "#94a3b8" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
