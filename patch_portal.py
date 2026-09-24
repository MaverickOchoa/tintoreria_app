import re

with open('frontend/src/components/ClientPortal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_pattern = r'import LockIcon from "@mui/icons-material/Lock";'
import_replacement = '''import LockIcon from "@mui/icons-material/Lock";
import DownloadIcon from "@mui/icons-material/Download";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
'''
content = content.replace(import_pattern, import_replacement)

# We need to add state for notifications and PWA install prompt
state_pattern = r'const \[tabIndex, setTabIndex\] = useState\(0\);'
state_replacement = '''const [tabIndex, setTabIndex] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [pushStatus, setPushStatus] = useState(Notification.permission);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
'''
content = content.replace(state_pattern, state_replacement)

effect_pattern = r'useEffect\(\(\) => \{\n    fetchData\(\);\n  \}, \[\]\);'
effect_replacement = '''useEffect(() => {
    fetchData();
    
    // PWA install prompt listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check iOS for instructions
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIos() && !isStandalone) {
      setShowIosPrompt(true);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\\-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert("Tu navegador no soporta notificaciones web.");
      return;
    }
    
    try {
      setIsSubscribing(true);
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      
      if (permission !== 'granted') {
        alert("Necesitas dar permisos de notificación en tu navegador.");
        setIsSubscribing(false);
        return;
      }
      
      const reg = await navigator.serviceWorker.ready;
      
      // Get public key from backend
      const pkRes = await fetch(`${API}/client-portal/notifications/public-key`);
      const pkData = await pkRes.json();
      const applicationServerKey = urlBase64ToUint8Array(pkData.public_key);
      
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      }
      
      const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh'))));
      const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth'))));
      
      const payload = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: p256dh,
          auth: auth
        }
      };
      
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/client-portal/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("¡Notificaciones activadas exitosamente!");
      } else {
        alert("Hubo un error al activar notificaciones en el servidor.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al intentar suscribirse a notificaciones: " + err.message);
    } finally {
      setIsSubscribing(false);
    }
  };
'''
content = content.replace(effect_pattern, effect_replacement)

# We need to add the buttons in the UI. 
ui_pattern = r'Bienvenido, \{client\?.full_name\}'
ui_replacement = '''Bienvenido, {client?.full_name}
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mt: 2, mb: 2 }} flexWrap="wrap">
          {(deferredPrompt) && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<DownloadIcon />} 
              onClick={handleInstallClick}
              sx={{ borderRadius: "20px" }}
            >
              Instalar App
            </Button>
          )}
          {pushStatus !== 'granted' && (
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<NotificationsActiveIcon />} 
              onClick={handleSubscribePush}
              disabled={isSubscribing}
              sx={{ borderRadius: "20px" }}
            >
              Activar Notificaciones
            </Button>
          )}
          {pushStatus === 'granted' && (
            <Chip 
              icon={<NotificationsActiveIcon />} 
              label="Notificaciones Activas" 
              color="success" 
              variant="outlined" 
            />
          )}
        </Stack>

        {showIosPrompt && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: "12px" }}>
            Para instalar esta app en tu iPhone: presiona el ícono <strong>Compartir</strong> en la barra inferior y selecciona <strong>"Agregar a inicio"</strong>. Luego ábrela para activar las notificaciones.
          </Alert>
        )}
'''
content = content.replace('Bienvenido, {client?.full_name}\n        </Typography>', ui_replacement)

with open('frontend/src/components/ClientPortal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
