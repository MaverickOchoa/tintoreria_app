import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function CountingGame() {
  const [targetNumber, setTargetNumber] = useState(3);
  const [treeApples, setTreeApples] = useState([]);
  const [basketApples, setBasketApples] = useState([]);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    // Generar un número aleatorio entre 3 y 8
    const num = Math.floor(Math.random() * 6) + 3;
    setTargetNumber(num);
    
    // Iniciar con 10 manzanas en el árbol
    setTreeApples(
      Array.from({ length: 10 }, (_, i) => ({
        id: `apple-${Date.now()}-${i}`,
        content: '🍎'
      }))
    );
    setBasketApples([]);
    setMessage('');
    setSuccess(false);
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    
    // Si se soltó fuera de un área droppable
    if (!destination) return;

    // Si se soltó en el mismo lugar
    if (source.droppableId === destination.droppableId) return;

    // Mover del árbol a la canasta
    if (source.droppableId === 'tree' && destination.droppableId === 'basket') {
      const newTree = Array.from(treeApples);
      const [moved] = newTree.splice(source.index, 1);
      const newBasket = Array.from(basketApples);
      newBasket.splice(destination.index, 0, moved);
      setTreeApples(newTree);
      setBasketApples(newBasket);
    } 
    // Mover de la canasta al árbol
    else if (source.droppableId === 'basket' && destination.droppableId === 'tree') {
      const newBasket = Array.from(basketApples);
      const [moved] = newBasket.splice(source.index, 1);
      const newTree = Array.from(treeApples);
      newTree.splice(destination.index, 0, moved);
      setBasketApples(newBasket);
      setTreeApples(newTree);
    }
  };

  const checkAnswer = () => {
    if (basketApples.length === targetNumber) {
      setSuccess(true);
      setMessage('¡Excelente! Lo hiciste muy bien. 🌟');
    } else {
      setSuccess(false);
      if (basketApples.length > targetNumber) {
        setMessage('¡Ups! Te pasaste un poquito. Quita algunas manzanas.');
      } else {
        setMessage('Faltan algunas manzanas. ¡Tú puedes!');
      }
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Instrucciones */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" fontWeight="900" color="#ff7043" sx={{ fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif" }}>
          Pon {targetNumber} manzanas en la canasta
        </Typography>
        <Typography variant="h5" color="#546e7a" mt={1}>
          (Arrastra las manzanas desde el árbol)
        </Typography>
      </Box>

      {/* Alertas / Mensajes */}
      {message && (
        <Box 
          sx={{ 
            mb: 3, p: 2, borderRadius: 6, 
            bgcolor: success ? '#fff9c4' : '#ffe0b2', 
            color: success ? '#f57f17' : '#e65100',
            border: `3px dashed ${success ? '#fbc02d' : '#ffb74d'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}
        >
          {success && <StarIcon sx={{ fontSize: 40, color: '#fbc02d' }} />}
          <Typography variant="h5" fontWeight="bold">
            {message}
          </Typography>
          {success && <StarIcon sx={{ fontSize: 40, color: '#fbc02d' }} />}
        </Box>
      )}

      {/* Áreas de Drag & Drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
          
          {/* Zona 1: El Árbol (Origen) */}
          <Box flex={1}>
            <Typography variant="h5" fontWeight="bold" textAlign="center" mb={2} color="#2e7d32">
              Árbol 🌳
            </Typography>
            <Droppable droppableId="tree" direction="horizontal">
              {(provided, snapshot) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    height: 380, // Tamaño fijo
                    bgcolor: snapshot.isDraggingOver ? '#c8e6c9' : '#e8f5e9',
                    borderRadius: 6,
                    border: '4px dashed #81c784',
                    p: 3,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                    gap: 2
                  }}
                >
                  {treeApples.map((apple, index) => (
                    <Draggable key={apple.id} draggableId={apple.id} index={index} isDragDisabled={success}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            fontSize: '4rem',
                            userSelect: 'none',
                            transform: snapshot.isDragging ? 'scale(1.2)' : 'none',
                            transition: 'transform 0.1s',
                            lineHeight: 1
                          }}
                        >
                          {apple.content}
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </Box>

          {/* Zona 2: La Canasta (Destino) */}
          <Box flex={1}>
            <Typography variant="h5" fontWeight="bold" textAlign="center" mb={2} color="#f57c00">
              Canasta 🧺
            </Typography>
            <Droppable droppableId="basket" direction="horizontal">
              {(provided, snapshot) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    height: 380, // Tamaño fijo
                    bgcolor: snapshot.isDraggingOver ? '#ffe0b2' : '#fff3e0',
                    borderRadius: 6,
                    border: '4px solid #ffb74d',
                    p: 3,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                    gap: 2
                  }}
                >
                  {basketApples.map((apple, index) => (
                    <Draggable key={apple.id} draggableId={apple.id} index={index} isDragDisabled={success}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            fontSize: '4rem',
                            userSelect: 'none',
                            transform: snapshot.isDragging ? 'scale(1.2)' : 'none',
                            transition: 'transform 0.1s',
                            lineHeight: 1
                          }}
                        >
                          {apple.content}
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </Box>

        </Box>
      </DragDropContext>

      {/* Botones de Acción */}
      <Box mt={5} display="flex" justifyContent="center" gap={3}>
        {!success ? (
          <Button 
            variant="contained" 
            color="success" 
            size="large"
            startIcon={<CheckCircleIcon />}
            onClick={checkAnswer}
            sx={{ borderRadius: 8, fontSize: '1.5rem', px: 6, py: 2, fontWeight: 'bold', bgcolor: '#66bb6a', color: 'white', '&:hover': { bgcolor: '#4caf50' } }}
          >
            ¡Revisar!
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            startIcon={<RefreshIcon />}
            onClick={startNewGame}
            sx={{ borderRadius: 8, fontSize: '1.5rem', px: 6, py: 2, fontWeight: 'bold', bgcolor: '#29b6f6' }}
          >
            Siguiente Misión
          </Button>
        )}
      </Box>
    </Box>
  );
}
