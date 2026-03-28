import React from "react";
import { Modal as MuiModal, Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Estilos para el contenedor del contenido dentro del modal
const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  // Establecemos un ancho máximo coherente con nuestras tarjetas (SM)
  maxWidth: 500,
  width: "90%",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4, // Padding interno
  borderRadius: 2, // Borde redondeado
};

const Modal = ({ children, open, onClose, title = "" }) => {
  return (
    <MuiModal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box sx={style}>
        {/* Título del Modal (Opcional) */}
        {title && (
          <Typography
            id="modal-title"
            variant="h6"
            component="h2"
            sx={{ mb: 2 }}
          >
            {title}
          </Typography>
        )}

        {/* Botón de Cerrar */}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Contenido del Modal */}
        {children}
      </Box>
    </MuiModal>
  );
};

export default Modal;
